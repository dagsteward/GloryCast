FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app

# FFmpeg for restreaming
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=3003

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 worker

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY package*.json ./

USER worker
EXPOSE 3003 1935 8088

CMD ["node", "dist/main.js"]
