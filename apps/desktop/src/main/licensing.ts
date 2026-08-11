import { app, ipcMain } from 'electron'
import { createHash, createPublicKey, verify as verifySignature } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { hostname, platform, arch, cpus, totalmem } from 'os'
import {
  canonicalPayload,
  evaluateEntitlement,
  shouldRevalidate,
  type Entitlement,
  type SignedLicense,
  type TrialRecord,
} from '@glorycast/licensing'

// ─────────────────────────────────────────────────────────────────────────────
// Licensing — trial tracking, offline licence validation, activation.
//
// Design constraints, in priority order:
//
//   1. A licence check must NEVER be able to stop a service. Validation is
//      offline by default; the network is only ever used to refresh, and
//      failing to reach the server is not an error the operator sees.
//   2. Verification is cryptographic, not a server call. We ship an Ed25519
//      public key; the licence server holds the private key. A signed licence
//      proves entitlement with no connectivity at all.
//   3. Copy protection is honest friction, not DRM. Electron cannot be made
//      tamper-proof, and pretending otherwise wastes effort better spent on
//      the cloud features that genuinely cannot be copied.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ed25519 public key for licence verification, SPKI/PEM.
 *
 * The matching private key lives only on the licence server. Replacing this
 * constant invalidates every licence in the field, so it is versioned with the
 * app and must never be regenerated casually.
 *
 * Overridable at build time so staging can issue test licences without the
 * production key.
 */
const LICENSE_PUBLIC_KEY = process.env.GLORYCAST_LICENSE_PUBKEY ?? `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAuqY1HRveBX+UHdHrkRW/jKQ4lqBFDVFKtK66og+7ONk=
-----END PUBLIC KEY-----`

/** Where the licence server lives. Configurable for self-hosting. */
const LICENSE_API =
  process.env.GLORYCAST_LICENSE_API
  ?? `${(process.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '')}/api/v1/licence`

function stateDir(): string {
  const dir = join(app.getPath('userData'), 'licence')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const licenseFile = () => join(stateDir(), 'licence.json')
const trialFile = () => join(stateDir(), 'trial.json')

/**
 * Stable-ish machine fingerprint.
 *
 * Deliberately built from properties that survive an app reinstall but change
 * on a different machine. It is a seat-counting aid, not a security boundary —
 * anything derivable on the client can be forged by a determined user, and
 * binding too tightly (e.g. to a MAC address) generates support tickets every
 * time a church changes a network card.
 */
export function deviceFingerprint(): string {
  const cpu = cpus()[0]?.model ?? 'unknown-cpu'
  const raw = [
    hostname(),
    platform(),
    arch(),
    cpu,
    // Rounded to GB so a RAM upgrade does not invalidate the activation.
    Math.round(totalmem() / 1024 / 1024 / 1024),
  ].join('|')

  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function readJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    // A corrupt file must not brick the app; treat it as absent.
    return null
  }
}

function writeJson(path: string, value: unknown): void {
  try {
    writeFileSync(path, JSON.stringify(value, null, 2), 'utf8')
  } catch (err) {
    console.error('[licensing] could not persist state:', err)
  }
}

/** Verify the server's signature over a licence payload. */
function isSignatureValid(license: SignedLicense): boolean {
  try {
    const key = createPublicKey(LICENSE_PUBLIC_KEY)
    return verifySignature(
      null,                                     // Ed25519 takes no digest
      Buffer.from(canonicalPayload(license.payload), 'utf8'),
      key,
      Buffer.from(license.signature, 'base64'),
    )
  } catch {
    return false
  }
}

/**
 * Load the trial record, creating it on first launch.
 *
 * The high-water mark advances every time we look, so winding the system clock
 * backwards cannot extend the trial. It never moves backwards, so a user
 * correcting a genuinely wrong clock is not penalised permanently.
 */
function loadTrial(): TrialRecord {
  const now = new Date().toISOString()
  const existing = readJson<TrialRecord>(trialFile())

  if (!existing) {
    const fresh: TrialRecord = { startedAt: now, highWaterMark: now }
    writeJson(trialFile(), fresh)
    return fresh
  }

  if (new Date(now) > new Date(existing.highWaterMark)) {
    const updated: TrialRecord = { ...existing, highWaterMark: now }
    writeJson(trialFile(), updated)
    return updated
  }

  return existing
}

function loadLicense(): SignedLicense | null {
  return readJson<SignedLicense>(licenseFile())
}

/** Current entitlement, computed entirely offline. */
export function currentEntitlement(): Entitlement {
  const license = loadLicense()
  return evaluateEntitlement({
    license,
    signatureValid: license ? isSignatureValid(license) : false,
    deviceId: deviceFingerprint(),
    trial: loadTrial(),
  })
}

/**
 * Exchange a licence key for a signed licence.
 *
 * This is the only step that requires the internet, and it happens once when
 * the operator activates — never during a service.
 */
async function activate(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${LICENSE_API}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: key.trim(),
        deviceId: deviceFingerprint(),
        deviceName: hostname(),
        appVersion: app.getVersion(),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 404) {
        return { ok: false, error: 'That licence key was not recognised.' }
      }
      if (response.status === 409) {
        return {
          ok: false,
          error: 'This licence has no seats left. Deactivate another machine first.',
        }
      }
      return { ok: false, error: detail || `Activation failed (${response.status}).` }
    }

    const signed = (await response.json()) as SignedLicense

    // Never trust the server blindly: a licence that does not verify against
    // our embedded key is worthless, and storing it would produce a confusing
    // "invalid licence" state later instead of a clear failure now.
    if (!isSignatureValid(signed)) {
      return { ok: false, error: 'The licence returned by the server failed verification.' }
    }

    writeJson(licenseFile(), {
      ...signed,
      lastValidatedAt: new Date().toISOString(),
    })
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Could not reach the licence server. Check your internet connection.',
    }
  }
}

/**
 * Refresh the stored licence in the background.
 *
 * Silent by design: a failed refresh is expected on church networks and must
 * not surface as an error. It only matters if it keeps failing past the
 * offline tolerance window, which the entitlement logic handles.
 */
async function refresh(): Promise<void> {
  const license = loadLicense()
  if (!license || !shouldRevalidate(license)) return

  try {
    const response = await fetch(`${LICENSE_API}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: license.payload.key, deviceId: deviceFingerprint() }),
    })
    if (!response.ok) return

    const signed = (await response.json()) as SignedLicense
    if (!isSignatureValid(signed)) return

    writeJson(licenseFile(), { ...signed, lastValidatedAt: new Date().toISOString() })
  } catch {
    // Offline. Entirely expected; the licence keeps working.
  }
}

/** Release this machine's seat so it can be used elsewhere. */
async function deactivate(): Promise<{ ok: true } | { ok: false; error: string }> {
  const license = loadLicense()
  if (!license) return { ok: true }

  try {
    await fetch(`${LICENSE_API}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: license.payload.key, deviceId: deviceFingerprint() }),
    })
  } catch {
    // Even if the server is unreachable, remove the local licence — the
    // operator asked to release this machine and should not be stuck.
  }

  writeJson(licenseFile(), null)
  try { writeFileSync(licenseFile(), 'null', 'utf8') } catch { /* best effort */ }
  return { ok: true }
}

export function registerLicensing(): void {
  ipcMain.handle('licence:status', () => currentEntitlement())
  ipcMain.handle('licence:device-id', () => deviceFingerprint())

  ipcMain.handle('licence:activate', async (_e, key: string) => {
    const result = await activate(key)
    return result.ok ? { ok: true as const, entitlement: currentEntitlement() } : result
  })

  ipcMain.handle('licence:deactivate', async () => {
    await deactivate()
    return { ok: true as const, entitlement: currentEntitlement() }
  })

  // Refresh shortly after launch, well clear of anything time-critical.
  setTimeout(() => { void refresh() }, 30_000)
}
