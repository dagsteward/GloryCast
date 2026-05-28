export default () => ({
  nodeEnv:   process.env.NODE_ENV   ?? 'development',
  port:      parseInt(process.env.PORT ?? '3001', 10),
  apiPrefix: process.env.API_PREFIX  ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url:      process.env.REDIS_URL      ?? 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD ?? undefined,
  },

  jwt: {
    secret:         process.env.JWT_SECRET!,
    expiresIn:      process.env.JWT_EXPIRES_IN      ?? '15m',
    refreshSecret:  process.env.JWT_REFRESH_SECRET!,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  oauth: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackUrl:  process.env.GOOGLE_CALLBACK_URL  ?? 'http://localhost:3001/api/v1/auth/google/callback',
    },
    microsoft: {
      clientId:     process.env.MICROSOFT_CLIENT_ID     ?? '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      callbackUrl:  process.env.MICROSOFT_CALLBACK_URL  ?? 'http://localhost:3001/api/v1/auth/microsoft/callback',
    },
  },

  minio: {
    endpoint:    process.env.MINIO_ENDPOINT      ?? 'localhost',
    port:        parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSsl:      process.env.MINIO_USE_SSL === 'true',
    accessKey:   process.env.MINIO_ACCESS_KEY    ?? 'glorycast',
    secretKey:   process.env.MINIO_SECRET_KEY    ?? 'glorycast_secret',
    bucketMedia:       process.env.MINIO_BUCKET_MEDIA       ?? 'glorycast-media',
    bucketRecordings:  process.env.MINIO_BUCKET_RECORDINGS  ?? 'glorycast-recordings',
    publicUrl:   process.env.MINIO_PUBLIC_URL    ?? 'http://localhost:9000',
  },

  aiService: {
    url:         process.env.AI_SERVICE_URL  ?? 'http://localhost:3002',
    ollamaUrl:   process.env.OLLAMA_URL      ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL    ?? 'llama3.2:3b',
    whisperModel: process.env.WHISPER_MODEL  ?? 'base.en',
    whisperLang:  process.env.WHISPER_LANGUAGE ?? 'en',
  },

  streamService: {
    url:      process.env.STREAM_SERVICE_URL ?? 'http://localhost:3003',
    rtmpUrl:  process.env.RTMP_SERVER_URL   ?? 'rtmp://localhost:1935',
    srtUrl:   process.env.SRT_SERVER_URL    ?? 'srt://localhost:4000',
  },

  livekit: {
    url:       process.env.LIVEKIT_URL        ?? 'ws://localhost:7880',
    apiKey:    process.env.LIVEKIT_API_KEY    ?? 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? 'secret',
  },

  throttle: {
    ttl:   parseInt(process.env.THROTTLE_TTL   ?? '60',  10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
  },

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})
