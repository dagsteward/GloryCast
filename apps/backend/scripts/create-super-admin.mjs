#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Create (or promote) a SUPER_ADMIN account.
//
// Run this from inside the deployed environment — Railway's Console tab for
// the backend service — where DATABASE_URL is already set. It needs no
// secrets pasted anywhere, and nothing here is ever exposed outside that
// environment.
//
//   node scripts/create-super-admin.mjs you@example.com 'a-strong-password'
//
// Role in this schema is per-church (ChurchMember.role), read at login from
// the caller's default membership — there is no standalone "global admin"
// flag. A SUPER_ADMIN therefore still needs a church to belong to; this
// script creates a minimal platform-operator church on first run and reuses
// it on every run after.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, Role } from '@prisma/client'
// bcryptjs is CommonJS; under Node's ESM loader only the default export is
// available; { hash } as a named import fails at runtime, not at lint time.
import bcrypt from 'bcryptjs'
const { hash } = bcrypt

const [, , email, password] = process.argv

if (!email || !password) {
  console.error('Usage: node scripts/create-super-admin.mjs <email> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const church = await prisma.church.upsert({
    where: { slug: 'glorycast-platform' },
    create: {
      name: 'GloryCast Platform',
      slug: 'glorycast-platform',
      description: 'Internal — houses platform-operator accounts, not a customer church.',
    },
    update: {},
  })

  const passwordHash = await hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      emailVerified: true,
    },
    // Re-running with a new password rotates it; nothing else about an
    // existing account changes.
    update: { passwordHash },
  })

  await prisma.churchMember.upsert({
    where: { userId_churchId: { userId: user.id, churchId: church.id } },
    create: {
      userId: user.id,
      churchId: church.id,
      role: Role.SUPER_ADMIN,
      isDefault: true,
    },
    update: { role: Role.SUPER_ADMIN, isDefault: true },
  })

  console.log(`\n✔ ${email} is now SUPER_ADMIN.`)
  console.log('\nLog in with:')
  console.log(`  POST /api/v1/auth/login`)
  console.log(`  { "email": "${email}", "password": "<the password you just set>" }`)
  console.log('\nThe returned accessToken authorises POST /licence/issue,')
  console.log('POST /licence/:key/resend, and GET /licence/:key.')
}

main()
  .catch((err) => {
    console.error('Failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
