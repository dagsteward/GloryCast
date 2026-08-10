# ─────────────────────────────────────────────────────────────────────────────
# GloryCast API — container image for Railway.
#
# Built from the repo ROOT, not apps/backend: this is an npm-workspaces
# monorepo, so the lockfile and workspace links only resolve correctly from
# here. Set Railway's root directory to "/" and point it at this Dockerfile.
#
# Only the backend ships. The desktop app is distributed as an installer and
# the media workers do not belong on a platform billed by egress.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim AS base
# Prisma needs OpenSSL present; the slim image omits it.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
# Copy only manifests first so this layer caches until dependencies change.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/licensing/package.json packages/licensing/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci --workspace=@glorycast/backend --include-workspace-root

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY apps/backend apps/backend
COPY packages/licensing packages/licensing
COPY packages/shared-types packages/shared-types
COPY tsconfig.base.json ./

WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

# Railway injects PORT; the app must bind to it and to 0.0.0.0, not localhost.
EXPOSE 3001

# Migrations run at boot so a deploy cannot serve a schema the database does
# not have. `migrate deploy` only applies committed migrations — it never
# generates or resets, so it is safe to run on every start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
