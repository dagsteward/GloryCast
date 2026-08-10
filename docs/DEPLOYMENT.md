# GloryCast — deployment

Three pieces, deployed differently:

| Piece | Where | Why |
|---|---|---|
| API (`apps/backend`) | Railway | Long-lived HTTP service |
| Database | Supabase Postgres | Managed, with pooling and backups |
| Desktop app | Installer via GitHub Releases | Native binary; needs the operator's GPU and devices |

Video never touches your infrastructure. The desktop app pushes RTMP **directly**
to YouTube/Facebook, so adding churches costs you no bandwidth.

---

## 1. Signing keys

Run once:

```bash
node apps/backend/scripts/generate-license-keys.mjs
```

- **Private key** → Railway variable `LICENSE_PRIVATE_KEY`. Never commit it.
  Anyone holding it can mint unlimited licences for your product.
- **Public key** → replace `LICENSE_PUBLIC_KEY` in
  `apps/desktop/src/main/licensing.ts`. Safe to commit; it can only verify.

Store the private key in a password manager as well as Railway. Losing it means
you can no longer issue or renew **any** licence, and the only recovery is
shipping a new app version with a new public key.

Rotating the pair invalidates every licence in the field. Treat it as permanent.

---

## 2. Supabase

Supabase gives you two connection strings and **they are not interchangeable**.

| Variable | Port | Used for | Why |
|---|---|---|---|
| `DATABASE_URL` | 6543 (pooler) | All runtime queries | Postgres allows only a few dozen direct connections; a container opening one per request exhausts them under Sunday load |
| `DIRECT_URL` | 5432 (direct) | Migrations only | PgBouncer's transaction pooling cannot run the session-level statements and advisory locks migrations need |

Both are under **Project Settings → Database → Connection string**.

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

The `pgbouncer=true` and `connection_limit=1` parameters are required, not
optional — without them Prisma prepares statements the pooler cannot reuse and
you get intermittent `prepared statement already exists` errors under load.

### Do not run `supabase init`

Prisma owns the schema. Supabase's CLI migrations are a second, competing
migration system over the same database — running both guarantees they diverge
and that one overwrites the other's changes.

Use the Supabase dashboard for inspection and backups. Apply schema changes only
through:

```bash
npx prisma migrate dev --name <change>     # locally, creates the migration
npx prisma migrate deploy                  # in CI/Railway, applies it
```

You do not need the Supabase JS client or the publishable key. GloryCast has its
own JWT auth and talks to Postgres through Prisma.

---

## 3. Railway

1. New project → deploy from this GitHub repo.
2. Leave the root directory as `/` — this is an npm-workspaces monorepo and the
   `Dockerfile` at the root is what builds correctly.
3. Add a **Redis** service (Supabase has no Redis; Bull queues and caching need
   it).
4. Set variables:

```
NODE_ENV=production
DATABASE_URL=...        # Supabase pooler, port 6543
DIRECT_URL=...          # Supabase direct, port 5432
REDIS_URL=...           # from the Railway Redis service
JWT_SECRET=...          # 32+ random chars
JWT_REFRESH_SECRET=...  # 32+ random chars, different
LICENSE_PRIVATE_KEY=... # full PEM including BEGIN/END lines
PADDLE_WEBHOOK_SECRET=...
CORS_ORIGINS=https://glorycast.ai
```

`PORT` is injected by Railway; the app already reads it and binds `0.0.0.0`.

Migrations run automatically on boot (`prisma migrate deploy`), so a deploy can
never serve a schema the database does not have.

Health check: `/api/v1/health`.

---

## 4. Paddle

1. Create the annual subscription product.
2. Webhook → `https://<your-app>.up.railway.app/api/v1/licence/webhook/paddle`
3. Copy the signing secret into `PADDLE_WEBHOOK_SECRET`.
4. Pass `email` and `organisation` in Paddle's `custom_data` on checkout.
   The webhook **refuses to guess an email** — a licence issued to the wrong
   address is worse than one that needs a support ticket to place.

Optional `custom_data`: `seats` (default 2), `termDays` (default 365).

---

## 5. Desktop build

Point the installer at production at build time:

```bash
cd apps/desktop
VITE_API_URL=https://<your-app>.up.railway.app npm run build
npm run dist
```

`VITE_API_URL` is baked in — it sets the API base **and** the packaged
Content-Security-Policy. Building without it produces an installer that calls
`localhost:3001` on every customer's machine.

---

## Still missing before you can take money

- **Licence delivery.** The webhook mints a key and logs it; nothing emails it.
  A customer would pay and receive nothing. Needs Resend or Postmark wiring in.
- **A live test.** The endpoints compile and the crypto is verified, but no
  request has hit a real database yet.
