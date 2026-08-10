import {
  Controller, Post, Req, Headers, Logger, BadRequestException, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { LicensingService } from './licensing.service'
import { Public } from '../../common/decorators/public.decorator'
import { LicenseStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Paddle webhook.
//
// Paddle is the Merchant of Record: they take the payment, handle global VAT
// and sales tax, and tell us what happened. This endpoint is the only thing
// that turns money into a licence, so it is treated as security-critical:
// every request is HMAC-verified before we look at its contents.
//
// Requires the RAW request body. Fastify must be configured to retain it —
// re-serialising the parsed JSON produces different bytes and the signature
// will never match.
// ─────────────────────────────────────────────────────────────────────────────

interface PaddleEvent {
  event_type: string
  data: {
    id?: string
    status?: string
    customer_id?: string
    custom_data?: Record<string, string> | null
    items?: Array<{ price?: { id?: string } }>
  }
}

@ApiTags('licensing')
@Controller('licence/webhook')
export class PaddleWebhookController {
  private readonly logger = new Logger(PaddleWebhookController.name)
  private readonly secret: string | null

  constructor(
    private readonly licensing: LicensingService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.get<string>('PADDLE_WEBHOOK_SECRET') ?? null
    if (!this.secret) {
      this.logger.warn(
        'PADDLE_WEBHOOK_SECRET is not set — payment webhooks will be rejected.',
      )
    }
  }

  /**
   * Verify Paddle's signature header.
   *
   * Format: `ts=1234567890;h1=<hex hmac>`, where the HMAC covers
   * `${ts}:${rawBody}`. The timestamp is checked to stop a captured webhook
   * being replayed later to extend a subscription for free.
   */
  private verify(signatureHeader: string | undefined, rawBody: string): boolean {
    if (!this.secret || !signatureHeader) return false

    const parts = Object.fromEntries(
      signatureHeader.split(';').map(p => p.split('=') as [string, string]),
    )
    const ts = parts.ts
    const received = parts.h1
    if (!ts || !received) return false

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts))
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      this.logger.warn('Rejected a webhook with a stale or invalid timestamp.')
      return false
    }

    const expected = createHmac('sha256', this.secret)
      .update(`${ts}:${rawBody}`)
      .digest('hex')

    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(received, 'utf8')
    // Length check first: timingSafeEqual throws on a length mismatch.
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }

  @Public()
  @Post('paddle')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Paddle billing webhook' })
  async handle(
    @Req() request: FastifyRequest & { rawBody?: string | Buffer },
    @Headers('paddle-signature') signature?: string,
  ) {
    const raw = request.rawBody
      ? request.rawBody.toString()
      : JSON.stringify(request.body)

    if (!this.verify(signature, raw)) {
      throw new BadRequestException('Invalid webhook signature.')
    }

    const event = JSON.parse(raw) as PaddleEvent
    const subscriptionId = event.data?.id
    const termDays = Number(event.data?.custom_data?.termDays ?? 365)

    this.logger.log(`Paddle event: ${event.event_type} (${subscriptionId ?? 'no id'})`)

    switch (event.event_type) {
      // A new subscription: mint a licence and email the key.
      case 'subscription.created': {
        const email = event.data.custom_data?.email
        const organisation = event.data.custom_data?.organisation

        if (!email) {
          // Never guess. A licence issued to the wrong address is worse than
          // one that needs a support ticket to place.
          this.logger.error(
            `subscription.created ${subscriptionId} carried no email; skipping issuance.`,
          )
          break
        }

        const { key } = await this.licensing.issue({
          organisation: organisation ?? email,
          email,
          termDays,
          seats: Number(event.data.custom_data?.seats ?? 2),
          provider: 'paddle',
          providerCustomerId: event.data.customer_id,
          providerSubscriptionId: subscriptionId,
        })

        // TODO: deliver `key` by email. Until that is wired, it is recoverable
        // from the admin lookup endpoint.
        this.logger.log(`Issued ${key} for Paddle subscription ${subscriptionId}`)
        break
      }

      // Renewal paid.
      case 'transaction.completed':
      case 'subscription.updated': {
        if (subscriptionId && event.data.status === 'active') {
          await this.licensing.renew(subscriptionId, termDays)
        }
        break
      }

      case 'subscription.past_due': {
        if (subscriptionId) {
          await this.licensing.setStatus(subscriptionId, LicenseStatus.PAST_DUE)
        }
        break
      }

      case 'subscription.canceled':
      case 'subscription.cancelled': {
        if (subscriptionId) {
          await this.licensing.setStatus(subscriptionId, LicenseStatus.CANCELLED)
        }
        break
      }

      default:
        // Unhandled events are normal; Paddle sends many we do not care about.
        break
    }

    // Always 200 on a verified event. A non-2xx makes Paddle retry, and
    // retrying an event we have already applied risks double-extending a term.
    return { received: true }
  }
}
