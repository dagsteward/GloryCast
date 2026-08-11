import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

// ─────────────────────────────────────────────────────────────────────────────
// Mail — transactional email, starting with licence delivery.
//
// A licence key that only exists in the database is worthless to a customer
// who just paid. This is what turns a webhook into something they actually
// receive.
//
// Uses Resend's HTTP API rather than SMTP: Railway (and most PaaS egress)
// treats SMTP ports inconsistently, while a plain HTTPS POST always works.
// A missing API key degrades to logging instead of throwing, so a mail outage
// never takes down the licence server that issues the key in the first place.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "GC7K2M9PQR4XZ3TNVW8H" -> "GC7K2-M9PQR-4XZ3T-NVW8H".
 *
 * Duplicated from formatKey() in packages/licensing rather than imported: the
 * backend image deliberately never depends on that package (licensing.service
 * reimplements canonicalPayload for the same reason), so this stays a self-
 * contained one-liner instead of pulling a workspace package into the Docker
 * build graph for a single formatting helper.
 */
function formatKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toUpperCase().replace(/(.{5})/g, '$1-').replace(/-$/, '')
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly resend: Resend | null
  private readonly from: string

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'GloryCast <noreply@glorycast.ai>'

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — transactional email will be logged, not sent.',
      )
      this.resend = null
    } else {
      this.resend = new Resend(apiKey)
    }
  }

  /**
   * Send the licence key to a customer after a successful purchase.
   *
   * Never throws: called from the Paddle webhook handler, which must return
   * 200 on an event it has already applied. A failed send here should not
   * make Paddle retry the whole event — the licence exists either way and is
   * recoverable through the admin lookup endpoint.
   */
  async sendLicenseKey(input: {
    to: string
    organisation: string
    key: string
    expiresAt: Date
    seats: number
  }): Promise<boolean> {
    const formattedKey = formatKey(input.key)
    const expiryDate = input.expiresAt.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    if (!this.resend) {
      this.logger.warn(
        `Email not configured — licence ${formattedKey} for ${input.to} was not sent. ` +
        'It remains retrievable via the admin lookup endpoint.',
      )
      return false
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: input.to,
        subject: 'Your GloryCast licence key',
        html: licenseEmailHtml({ ...input, formattedKey, expiryDate }),
        text: licenseEmailText({ ...input, formattedKey, expiryDate }),
      })

      if (error) {
        this.logger.error(`Resend rejected the licence email to ${input.to}: ${error.message}`)
        return false
      }

      this.logger.log(`Sent licence ${formattedKey} to ${input.to}`)
      return true
    } catch (err) {
      this.logger.error(
        `Failed to send licence email to ${input.to}: ${err instanceof Error ? err.message : err}`,
      )
      return false
    }
  }
}

function licenseEmailText(input: {
  organisation: string; formattedKey: string; expiryDate: string; seats: number
}): string {
  return [
    `Thank you for subscribing to GloryCast, ${input.organisation}!`,
    '',
    `Your licence key:  ${input.formattedKey}`,
    '',
    `Seats: ${input.seats}`,
    `Renews: ${input.expiryDate}`,
    '',
    'To activate:',
    '  1. Open GloryCast Studio',
    '  2. Go to Settings → Activate Licence (or click "Activate licence" in the',
    '     banner at the top of the app)',
    '  3. Paste your key and click Activate',
    '',
    'Keep this email — you will need the key again if you reinstall or move to',
    'a new machine.',
    '',
    'Questions? Just reply to this email.',
    '',
    '— The GloryCast Team',
  ].join('\n')
}

/**
 * Inline styles throughout: this is transactional email, read in clients that
 * strip <style> blocks and often external stylesheets entirely.
 */
function licenseEmailHtml(input: {
  organisation: string; formattedKey: string; expiryDate: string; seats: number
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0a12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#12121c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

        <tr><td style="padding:28px 32px 0;">
          <div style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">GloryCast OS</div>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;">Thank you, ${esc(input.organisation)}!</div>
          <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.55);margin:8px 0 0;">
            Your GloryCast subscription is active. Here is your licence key.
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <div style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;text-align:center;">
            <div style="font-family:'SF Mono',Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:0.04em;color:#c4b5fd;">
              ${esc(input.formattedKey)}
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:rgba(255,255,255,0.4);">Seats</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#fff;text-align:right;">${input.seats}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.4);">Renews</td>
              <td style="padding:8px 0;font-size:13px;color:#fff;text-align:right;">${esc(input.expiryDate)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">
            To activate
          </div>
          <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.9;color:rgba(255,255,255,0.7);">
            <li>Open GloryCast Studio</li>
            <li>Go to <b style="color:#fff;">Settings → Activate Licence</b></li>
            <li>Paste your key and click <b style="color:#fff;">Activate</b></li>
          </ol>
        </td></tr>

        <tr><td style="padding:24px 32px 28px;">
          <p style="font-size:12px;line-height:1.6;color:rgba(255,255,255,0.35);margin:0;">
            Keep this email — you'll need the key again if you reinstall or move to a new
            machine. Questions? Just reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
