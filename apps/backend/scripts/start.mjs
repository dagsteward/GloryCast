#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Production entrypoint.
//
// Replaces `prisma migrate deploy && node dist/main`. With `&&`, a migration
// failure short-circuits and the app never starts — the platform reports only
// "healthcheck failed", with the actual cause buried or absent. This makes
// every startup phase explicit in the deploy log.
// ─────────────────────────────────────────────────────────────────────────────

import { spawnSync, spawn } from 'node:child_process'

const log = (msg) => console.log(`[startup] ${msg}`)
const fail = (msg) => console.error(`[startup] ERROR: ${msg}`)

// ── Configuration check ─────────────────────────────────────────────────────
// Catch missing variables here rather than letting them surface as an opaque
// crash or a hang three layers down.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
const missing = REQUIRED.filter((name) => !process.env[name]?.trim())

if (missing.length > 0) {
  fail(`missing required environment variable(s): ${missing.join(', ')}`)
  fail('Set them in your platform\'s Variables tab and redeploy.')
  process.exit(1)
}

// ── Connection string sanity ────────────────────────────────────────────────
// Two mistakes account for nearly every failed first deploy, and both produce
// unhelpful errors from Prisma. Catch them by name instead.
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  const value = process.env[name]?.trim()
  if (!value) continue

  // Pasting the whole `NAME=value` line into a platform's value field.
  if (value.startsWith(`${name}=`)) {
    fail(`${name} contains the variable name in its value.`)
    fail(`It starts with "${name}=". Paste only the part AFTER the "=".`)
    process.exit(1)
  }

  // Template placeholders left unsubstituted. Prisma reports this as
  // "invalid domain character", which does not point at the cause.
  if (/[<>]/.test(value)) {
    const placeholder = value.match(/<[^>]*>/)?.[0] ?? '<...>'
    fail(`${name} still contains the placeholder ${placeholder}.`)
    fail('Copy the real connection string from Supabase →')
    fail('Project Settings → Database → Connection string.')
    process.exit(1)
  }

  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    fail(`${name} must start with postgresql:// — got "${value.slice(0, 24)}…"`)
    process.exit(1)
  }
}

if (!process.env.DIRECT_URL?.trim()) {
  // Not fatal — Prisma falls back to DATABASE_URL — but if that points at a
  // connection pooler, migrations will fail or half-apply.
  log('DIRECT_URL is not set; migrations will use DATABASE_URL.')
  log('If DATABASE_URL is a pooler (port 6543), set DIRECT_URL to the direct')
  log('connection (port 5432) or migrations will fail.')
}

const redacted = (url) => (url ?? '').replace(/:\/\/[^@]*@/, '://***@')
log(`database: ${redacted(process.env.DATABASE_URL)}`)
log(`migrations via: ${redacted(process.env.DIRECT_URL ?? process.env.DATABASE_URL)}`)

// ── Migrations ──────────────────────────────────────────────────────────────
log('applying migrations…')
const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (migrate.status !== 0) {
  fail(`prisma migrate deploy exited with code ${migrate.status}`)
  fail('The API will not start against a schema it cannot verify.')
  fail('Common causes: DIRECT_URL unset or pointing at the pooler; the')
  fail('database is unreachable; or credentials are wrong.')
  process.exit(1)
}

log('migrations applied')

// ── Application ─────────────────────────────────────────────────────────────
log(`starting API on port ${process.env.PORT ?? 3001}…`)

const app = spawn('node', ['dist/main'], { stdio: 'inherit' })

// Forward termination so the platform's stop signal reaches the app rather
// than being swallowed by this wrapper.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => app.kill(signal))
}

app.on('exit', (code) => process.exit(code ?? 0))
