import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, createPrivateKey, randomBytes, sign as signEd25519 } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { LicenseStatus } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Licensing service.
//
// This process holds the only copy of the Ed25519 private key. It mints signed
// licences that the desktop app verifies offline — which is what lets a church
// run a service with no internet at all.
//
// The signed payload here MUST stay byte-identical to the desktop's
// canonicalPayload() in packages/licensing. Any divergence in field order or
// naming silently invalidates every licence in the field.
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors LicensePayload in @glorycast/licensing. */
export interface LicensePayload {
  key: string
  organisation: string
  email: string
  issuedAt: string
  expiresAt: string
  seats: number
  devices: string[]
  addons?: string[]
}

export interface SignedLicense {
  payload: LicensePayload
  signature: string
  lastValidatedAt: string
}

const DAY_MS = 86_400_000

/** Grace granted to a PAST_DUE subscription while payment is retried. */
const DUNNING_DAYS = 14

@Injectable()
export class LicensingService {
  private readonly logger = new Logger(LicensingService.name)
  private readonly privateKeyPem: string | null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.privateKeyPem = this.config.get<string>('LICENSE_PRIVATE_KEY') ?? null

    if (!this.privateKeyPem) {
      // Loud on purpose: without a key the product cannot be sold, and a
      // silent misconfiguration would only surface when a paying customer
      // fails to activate.
      this.logger.error(
        'LICENSE_PRIVATE_KEY is not set. Licence activation will fail until it is configured.',
      )
    }
  }

  /**
   * Canonical JSON for signing.
   *
   * Field order is fixed and devices/addons are sorted so the same licence
   * always produces the same bytes. This mirrors canonicalPayload() in the
   * desktop package exactly.
   */
  private canonicalPayload(payload: LicensePayload): string {
    return JSON.stringify({
      key: payload.key,
      organisation: payload.organisation,
      email: payload.email,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      seats: payload.seats,
      devices: [...payload.devices].sort(),
      addons: [...(payload.addons ?? [])].sort(),
    })
  }

  private sign(payload: LicensePayload): string {
    if (!this.privateKeyPem) {
      throw new InternalServerErrorException('Licence signing is not configured.')
    }
    const key = createPrivateKey(this.privateKeyPem)
    return signEd25519(null, Buffer.from(this.canonicalPayload(payload), 'utf8'), key)
      .toString('base64')
  }

  /**
   * Generate a customer-facing licence key.
   *
   * Crockford-style alphabet: no I, L, O, U — the characters people misread
   * when copying a key off a screen or reading it down the phone to support.
   */
  static generateKey(): string {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
    const bytes = randomBytes(20)
    let out = 'GC'
    for (let i = 0; i < 18; i++) {
      out += alphabet[bytes[i] % alphabet.length]
    }
    return out
  }

  /** Normalise user input: strip separators and case. */
  static normaliseKey(key: string): string {
    return key.replace(/[^a-z0-9]/gi, '').toUpperCase()
  }

  private hashIp(ip?: string): string | null {
    if (!ip) return null
    // Hashed rather than stored: enough to spot abuse patterns, without
    // keeping a log of church IP addresses.
    return createHash('sha256').update(ip).digest('hex').slice(0, 32)
  }

  /**
   * Effective expiry, accounting for a failed payment still in dunning.
   * A PAST_DUE subscription keeps working while the card is retried.
   */
  private effectiveExpiry(license: { status: LicenseStatus; expiresAt: Date }): Date {
    if (license.status === LicenseStatus.PAST_DUE) {
      return new Date(license.expiresAt.getTime() + DUNNING_DAYS * DAY_MS)
    }
    return license.expiresAt
  }

  private async record(
    licenseId: string,
    type: string,
    detail?: string,
    deviceId?: string,
    ip?: string,
  ): Promise<void> {
    await this.prisma.licenseEvent.create({
      data: { licenseId, type, detail, deviceId, ipHash: this.hashIp(ip) },
    })
  }

  /**
   * Activate a licence on a machine and return a signed licence file.
   *
   * Re-activating an already-known device is idempotent and does NOT consume
   * a second seat — reinstalling the app must never cost a church a seat.
   */
  async activate(input: {
    key: string
    deviceId: string
    deviceName?: string
    appVersion?: string
    ip?: string
  }): Promise<SignedLicense> {
    const key = LicensingService.normaliseKey(input.key)

    const license = await this.prisma.license.findUnique({
      where: { key },
      include: { devices: { where: { releasedAt: null } } },
    })

    if (!license) throw new NotFoundException('That licence key was not recognised.')

    if (license.status === LicenseStatus.REVOKED) {
      throw new ForbiddenException(
        'This licence has been revoked. Please contact support.',
      )
    }
    if (license.status === LicenseStatus.CANCELLED) {
      throw new ForbiddenException(
        'This subscription was cancelled. Renew it to activate again.',
      )
    }

    const known = license.devices.find(d => d.deviceId === input.deviceId)

    if (!known && license.devices.length >= license.seats) {
      throw new ConflictException(
        `This licence is in use on ${license.devices.length} of ${license.seats} machines. ` +
        'Deactivate one, or add a seat, to activate here.',
      )
    }

    await this.prisma.licenseDevice.upsert({
      where: {
        licenseId_deviceId: { licenseId: license.id, deviceId: input.deviceId },
      },
      create: {
        licenseId: license.id,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        appVersion: input.appVersion,
      },
      update: {
        lastSeenAt: new Date(),
        releasedAt: null,
        deviceName: input.deviceName,
        appVersion: input.appVersion,
      },
    })

    await this.record(license.id, 'activate', input.deviceName, input.deviceId, input.ip)

    return this.buildSigned(license.id)
  }

  /**
   * Re-issue a signed licence for a machine that is already activated.
   *
   * Called periodically by the app. It is how a renewal, a seat change or a
   * revocation reaches an installation without the operator doing anything.
   */
  async refresh(input: { key: string; deviceId: string; ip?: string }): Promise<SignedLicense> {
    const key = LicensingService.normaliseKey(input.key)

    const license = await this.prisma.license.findUnique({
      where: { key },
      include: { devices: { where: { releasedAt: null } } },
    })

    if (!license) throw new NotFoundException('That licence key was not recognised.')
    if (license.status === LicenseStatus.REVOKED) {
      throw new ForbiddenException('This licence has been revoked.')
    }

    const known = license.devices.some(d => d.deviceId === input.deviceId)
    if (!known) {
      throw new ForbiddenException('This machine is not activated on that licence.')
    }

    await this.prisma.licenseDevice.update({
      where: { licenseId_deviceId: { licenseId: license.id, deviceId: input.deviceId } },
      data: { lastSeenAt: new Date() },
    })

    await this.record(license.id, 'refresh', undefined, input.deviceId, input.ip)

    return this.buildSigned(license.id)
  }

  /** Release a seat. Kept as a soft delete so the audit trail survives. */
  async deactivate(input: { key: string; deviceId: string; ip?: string }): Promise<void> {
    const key = LicensingService.normaliseKey(input.key)
    const license = await this.prisma.license.findUnique({ where: { key } })
    if (!license) throw new NotFoundException('That licence key was not recognised.')

    await this.prisma.licenseDevice.updateMany({
      where: { licenseId: license.id, deviceId: input.deviceId, releasedAt: null },
      data: { releasedAt: new Date() },
    })

    await this.record(license.id, 'deactivate', undefined, input.deviceId, input.ip)
  }

  /** Build and sign the current state of a licence. */
  private async buildSigned(licenseId: string): Promise<SignedLicense> {
    const license = await this.prisma.license.findUniqueOrThrow({
      where: { id: licenseId },
      include: { devices: { where: { releasedAt: null } } },
    })

    const payload: LicensePayload = {
      key: license.key,
      organisation: license.organisation,
      email: license.email,
      issuedAt: license.issuedAt.toISOString(),
      expiresAt: this.effectiveExpiry(license).toISOString(),
      seats: license.seats,
      devices: license.devices.map(d => d.deviceId),
      addons: [],
    }

    return {
      payload,
      signature: this.sign(payload),
      lastValidatedAt: new Date().toISOString(),
    }
  }

  // ── Lifecycle, driven by the payment provider ───────────────────────────

  /** Create a licence for a new subscription. Returns the customer's key. */
  async issue(input: {
    organisation: string
    email: string
    termDays?: number
    seats?: number
    provider?: string
    providerCustomerId?: string
    providerSubscriptionId?: string
  }): Promise<{ key: string; expiresAt: Date; seats: number }> {
    const termDays = input.termDays ?? 365
    const key = LicensingService.generateKey()

    const license = await this.prisma.license.create({
      data: {
        key,
        organisation: input.organisation,
        email: input.email.toLowerCase(),
        seats: input.seats ?? 2,
        expiresAt: new Date(Date.now() + termDays * DAY_MS),
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
      },
    })

    await this.record(license.id, 'issued', `${termDays} day term`)
    this.logger.log(`Issued licence ${key} to ${input.email}`)

    return { key, expiresAt: license.expiresAt, seats: license.seats }
  }

  /** Extend a subscription on successful payment. */
  async renew(providerSubscriptionId: string, termDays = 365): Promise<void> {
    const license = await this.prisma.license.findUnique({
      where: { providerSubscriptionId },
    })
    if (!license) {
      this.logger.warn(`Renewal for unknown subscription ${providerSubscriptionId}`)
      return
    }

    // Extend from whichever is later: a renewal paid early must add to the
    // remaining term, not truncate it.
    const base = license.expiresAt > new Date() ? license.expiresAt : new Date()

    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        expiresAt: new Date(base.getTime() + termDays * DAY_MS),
        status: LicenseStatus.ACTIVE,
      },
    })

    await this.record(license.id, 'renewed', `${termDays} day term`)
  }

  async setStatus(providerSubscriptionId: string, status: LicenseStatus): Promise<void> {
    const license = await this.prisma.license.findUnique({
      where: { providerSubscriptionId },
    })
    if (!license) return

    await this.prisma.license.update({ where: { id: license.id }, data: { status } })
    await this.record(license.id, status.toLowerCase())
  }

  /** Look up a licence for support and the customer portal. */
  async lookup(key: string) {
    return this.prisma.license.findUnique({
      where: { key: LicensingService.normaliseKey(key) },
      include: {
        devices: { where: { releasedAt: null } },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
  }

  // ── Admin console ────────────────────────────────────────────────────────

  /** Search/paginate licences for the admin console. */
  async list(params: {
    query?: string
    status?: LicenseStatus
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 25))
    const query = params.query?.trim()

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(query
        ? {
            OR: [
              { key: { contains: LicensingService.normaliseKey(query) } },
              { organisation: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        include: { _count: { select: { devices: { where: { releasedAt: null } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.license.count({ where }),
    ])

    return { items, total, page, limit }
  }

  /**
   * Admin-initiated status change (revoke, manual cancel, manual reactivate).
   * Distinct from setStatus() above, which is keyed by the payment provider's
   * subscription id and driven by webhooks — this is keyed by the customer-
   * facing licence key, for a human acting through the console.
   */
  async setStatusByKey(key: string, status: LicenseStatus, note?: string): Promise<void> {
    const license = await this.prisma.license.findUnique({
      where: { key: LicensingService.normaliseKey(key) },
    })
    if (!license) throw new NotFoundException('That licence key was not recognised.')

    await this.prisma.license.update({ where: { id: license.id }, data: { status } })
    await this.record(license.id, `admin_${status.toLowerCase()}`, note)
  }

  /** Platform-wide counts for the admin console's overview screen. */
  async overview() {
    const [byStatus, totalSeatsResult, expiringSoon, recentEvents] = await Promise.all([
      this.prisma.license.groupBy({ by: ['status'], _count: true }),
      this.prisma.license.aggregate({
        where: { status: LicenseStatus.ACTIVE },
        _sum: { seats: true },
      }),
      this.prisma.license.count({
        where: {
          status: LicenseStatus.ACTIVE,
          expiresAt: { lte: new Date(Date.now() + 30 * DAY_MS), gte: new Date() },
        },
      }),
      this.prisma.licenseEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { license: { select: { key: true, organisation: true } } },
      }),
    ])

    const counts = Object.fromEntries(
      Object.values(LicenseStatus).map(s => [s, 0]),
    ) as Record<LicenseStatus, number>
    for (const row of byStatus) counts[row.status] = row._count

    return {
      counts,
      totalActiveSeats: totalSeatsResult._sum.seats ?? 0,
      expiringSoon,
      recentEvents,
    }
  }
}
