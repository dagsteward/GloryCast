// ─────────────────────────────────────────────────────────────────────────────
// Licensing model.
//
// GloryCast sells one product on an annual subscription. All three workspaces
// are included — the tier is time, not features — so entitlement is a single
// question: is this installation currently licensed, in trial, or lapsed?
//
// Everything here is pure data and pure functions so the same logic runs in the
// main process (where signatures are verified) and the renderer (where the UI
// reacts to state), with no risk of the two disagreeing.
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 30

/**
 * How long a licence keeps working after its expiry date while renewal is
 * sorted out. A church that renews on the Monday must not lose Sunday.
 */
export const RENEWAL_GRACE_DAYS = 14

/**
 * How long the app runs without successfully re-checking with the licence
 * server. Church internet is unreliable and a service must never depend on it,
 * so this is deliberately generous.
 */
export const OFFLINE_TOLERANCE_DAYS = 45

/** The payload our server signs. Compact because it is stored and shipped. */
export interface LicensePayload {
  /** Licence key as shown to the customer. */
  key: string
  /** Who it belongs to, for display and support. */
  organisation: string
  email: string
  /** ISO date the subscription period began. */
  issuedAt: string
  /** ISO date entitlement ends, before grace. */
  expiresAt: string
  /** How many machines may be activated. */
  seats: number
  /** Machine fingerprints currently activated against this licence. */
  devices: string[]
  /** Reserved for future paid add-ons; empty on the single-tier plan. */
  addons?: string[]
}

/** A licence as stored on disk: payload plus the server's signature. */
export interface SignedLicense {
  payload: LicensePayload
  /** Base64 Ed25519 signature over the canonical JSON of `payload`. */
  signature: string
  /** ISO timestamp of the last successful server re-validation. */
  lastValidatedAt: string
}

export type EntitlementState =
  /** Inside the free trial. */
  | 'trial'
  /** Trial elapsed, nothing purchased. */
  | 'trial-expired'
  /** Paid and current. */
  | 'licensed'
  /** Past expiry but inside the renewal grace window. */
  | 'grace'
  /** Past expiry and grace. */
  | 'expired'
  /** Signature failed, or the licence was issued for another machine. */
  | 'invalid'

export interface Entitlement {
  state: EntitlementState
  /** True when the full product is usable. */
  active: boolean
  /** Whole days remaining in the current state; 0 once elapsed. */
  daysRemaining: number
  /** Shown in the UI. Always safe to display to a non-technical operator. */
  message: string
  /** Present when a licence is installed. */
  license: LicensePayload | null
  /**
   * True when output should carry an evaluation watermark. Trial output is
   * clean — a church evaluating the product must be able to use it for real,
   * or the trial proves nothing.
   */
  watermark: boolean
  /** True when starting a NEW stream or recording is blocked. */
  blockNewBroadcast: boolean
}

/** Local trial bookkeeping. */
export interface TrialRecord {
  /** ISO timestamp of first launch. */
  startedAt: string
  /**
   * Highest wall-clock time the app has ever observed. Winding the system
   * clock back is the oldest trick for extending a trial; comparing against
   * this makes it visible without punishing honest clock corrections.
   */
  highWaterMark: string
}

const DAY_MS = 86_400_000

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS))
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/**
 * Decide what this installation is entitled to.
 *
 * `signatureValid` is passed in rather than computed here: verification needs
 * Node's crypto and the embedded public key, which belong in the main process.
 * This keeps the decision logic testable and identical on both sides.
 */
export function evaluateEntitlement(input: {
  license: SignedLicense | null
  signatureValid: boolean
  /** Fingerprint of this machine. */
  deviceId: string
  trial: TrialRecord | null
  now?: Date
}): Entitlement {
  const now = input.now ?? new Date()
  const { license, signatureValid, deviceId, trial } = input

  // ── Licensed paths ──────────────────────────────────────────────────────
  if (license) {
    if (!signatureValid) {
      return {
        state: 'invalid',
        active: false,
        daysRemaining: 0,
        message: 'This licence could not be verified. Please re-activate it.',
        license: license.payload,
        watermark: true,
        blockNewBroadcast: true,
      }
    }

    if (license.payload.devices.length > 0 && !license.payload.devices.includes(deviceId)) {
      return {
        state: 'invalid',
        active: false,
        daysRemaining: 0,
        message:
          'This licence is activated on a different machine. ' +
          'Deactivate it there, or add a seat, to use GloryCast here.',
        license: license.payload,
        watermark: true,
        blockNewBroadcast: true,
      }
    }

    const expiresAt = new Date(license.payload.expiresAt)
    const graceEnds = new Date(expiresAt.getTime() + RENEWAL_GRACE_DAYS * DAY_MS)

    if (now <= expiresAt) {
      const daysRemaining = wholeDaysBetween(now, expiresAt)
      return {
        state: 'licensed',
        active: true,
        daysRemaining,
        message: daysRemaining <= 14
          ? `Your licence renews in ${plural(daysRemaining, 'day')}.`
          : 'Licence active.',
        license: license.payload,
        watermark: false,
        blockNewBroadcast: false,
      }
    }

    if (now <= graceEnds) {
      const daysRemaining = wholeDaysBetween(now, graceEnds)
      return {
        state: 'grace',
        active: true,
        daysRemaining,
        // Grace keeps everything working. Cutting a church off the moment a
        // card expires is how you lose them, not how you get paid.
        message:
          `Your licence expired. GloryCast keeps working for ${plural(daysRemaining, 'day')} ` +
          'while you renew.',
        license: license.payload,
        watermark: false,
        blockNewBroadcast: false,
      }
    }

    return {
      state: 'expired',
      active: false,
      daysRemaining: 0,
      message: 'Your licence has expired. Renew it to start new streams and recordings.',
      license: license.payload,
      watermark: true,
      blockNewBroadcast: true,
    }
  }

  // ── Trial paths ─────────────────────────────────────────────────────────
  if (!trial) {
    return {
      state: 'trial',
      active: true,
      daysRemaining: TRIAL_DAYS,
      message: `Free trial — ${plural(TRIAL_DAYS, 'day')} remaining.`,
      license: null,
      watermark: false,
      blockNewBroadcast: false,
    }
  }

  // Guard against the clock being wound back to extend the trial.
  const observed = new Date(
    Math.max(now.getTime(), new Date(trial.highWaterMark).getTime()),
  )
  const trialEnds = new Date(new Date(trial.startedAt).getTime() + TRIAL_DAYS * DAY_MS)

  if (observed <= trialEnds) {
    const daysRemaining = wholeDaysBetween(observed, trialEnds)
    return {
      state: 'trial',
      active: true,
      daysRemaining,
      message: `Free trial — ${plural(daysRemaining, 'day')} remaining.`,
      license: null,
      // Trial output is deliberately clean and unrestricted: a church has to
      // be able to run real services on it, or the trial has proved nothing
      // by the time they must decide.
      watermark: false,
      blockNewBroadcast: false,
    }
  }

  return {
    state: 'trial-expired',
    active: false,
    daysRemaining: 0,
    message: 'Your free trial has ended. Activate a licence to continue streaming.',
    license: null,
    watermark: true,
    blockNewBroadcast: true,
  }
}

/**
 * True when the app should try to re-validate with the licence server.
 *
 * Failure is never fatal — it only matters once OFFLINE_TOLERANCE_DAYS have
 * passed without any successful contact.
 */
export function shouldRevalidate(license: SignedLicense | null, now = new Date()): boolean {
  if (!license) return false
  const last = new Date(license.lastValidatedAt).getTime()
  return now.getTime() - last > 7 * DAY_MS
}

/** True when the app has gone too long without reaching the licence server. */
export function offlineToleranceExceeded(
  license: SignedLicense | null,
  now = new Date(),
): boolean {
  if (!license) return false
  const last = new Date(license.lastValidatedAt).getTime()
  return now.getTime() - last > OFFLINE_TOLERANCE_DAYS * DAY_MS
}

/** Normalise a licence key for comparison: "gc-ab12…" → "GCAB12…". */
export function normaliseKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

/** Format a key for display in groups of five. */
export function formatKey(key: string): string {
  return normaliseKey(key).replace(/(.{5})/g, '$1-').replace(/-$/, '')
}

/** Canonical JSON used for signing and verification — key order must be stable. */
export function canonicalPayload(payload: LicensePayload): string {
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
