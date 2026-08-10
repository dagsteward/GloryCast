#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Generate the Ed25519 keypair used to sign GloryCast licences.
//
//   node scripts/generate-license-keys.mjs
//
// Run this ONCE. The private key signs every licence you ever issue; the public
// key is compiled into the desktop app to verify them offline.
//
// Rotating the pair invalidates every licence in the field — every customer
// would have to re-activate. Treat it as permanent.
// ─────────────────────────────────────────────────────────────────────────────

import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')

const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim()
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim()

console.log(`
════════════════════════════════════════════════════════════════════════════
  GloryCast licence signing keypair
════════════════════════════════════════════════════════════════════════════

1. PRIVATE KEY — server only.

   Set it as the LICENSE_PRIVATE_KEY environment variable on Railway
   (Variables tab, paste including the BEGIN/END lines).

   Never commit it. Never put it in the desktop app. Anyone holding this
   can mint unlimited licences for your product.

${privatePem}

────────────────────────────────────────────────────────────────────────────

2. PUBLIC KEY — ships inside the desktop app.

   Replace LICENSE_PUBLIC_KEY in:
     apps/desktop/src/main/licensing.ts

   Safe to commit. It can only verify signatures, never create them.

${publicPem}

════════════════════════════════════════════════════════════════════════════

  Store the private key in a password manager as well as on Railway.
  Losing it means you can no longer issue or renew ANY licence, and the
  only recovery is shipping a new app version with a new public key.

════════════════════════════════════════════════════════════════════════════
`)
