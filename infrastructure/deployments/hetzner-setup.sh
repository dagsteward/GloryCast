#!/usr/bin/env bash
# GloryCast — Hetzner/Ubuntu 22.04 server bootstrap script
# Run as root on a fresh VPS: bash hetzner-setup.sh

set -euo pipefail

DEPLOY_USER="glorycast"
APP_DIR="/opt/glorycast"

echo "==> Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  git curl wget unzip \
  nginx certbot python3-certbot-nginx \
  ffmpeg \
  ufw fail2ban

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

echo "==> Installing Docker Compose plugin..."
apt-get install -y docker-compose-plugin

echo "==> Creating deploy user..."
id -u $DEPLOY_USER &>/dev/null || useradd -m -s /bin/bash $DEPLOY_USER
usermod -aG docker $DEPLOY_USER

echo "==> Setting up app directory..."
mkdir -p $APP_DIR
chown $DEPLOY_USER:$DEPLOY_USER $APP_DIR

echo "==> Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh
systemctl enable --now ollama

echo "==> Pulling Ollama model (mistral, ~4GB)..."
ollama pull mistral || echo "Warning: Ollama model pull failed — run manually"

echo "==> Installing whisper.cpp..."
cd /tmp
git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make -j$(nproc)
cp main /usr/local/bin/whisper
mkdir -p /models
bash ./models/download-ggml-model.sh base.en && cp models/ggml-base.en.bin /models/ || \
  echo "Warning: Whisper model download failed — run manually"
cd /

echo "==> Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1935/tcp   # RTMP
ufw allow 7880/tcp   # LiveKit
ufw allow 7882/udp   # LiveKit WebRTC
ufw --force enable

echo "==> Configuring fail2ban..."
systemctl enable --now fail2ban

echo "==> Creating .env template..."
cat > $APP_DIR/.env.prod.example << 'ENV'
# Database
DATABASE_URL=postgresql://glorycast:CHANGE_ME@postgres:5432/glorycast
POSTGRES_PASSWORD=CHANGE_ME

# Redis
REDIS_URL=redis://:CHANGE_ME@redis:6379
REDIS_PASSWORD=CHANGE_ME

# JWT
JWT_SECRET=CHANGE_ME_LONG_RANDOM_STRING
JWT_REFRESH_SECRET=CHANGE_ME_ANOTHER_LONG_RANDOM_STRING

# MinIO
MINIO_ENDPOINT=storage.glorycast.ai
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=glorycast
MINIO_SECRET_KEY=CHANGE_ME
MINIO_BUCKET=glorycast
MINIO_PUBLIC_URL=https://storage.glorycast.ai

# AI Services
AI_SERVICE_URL=http://ai-worker:3002
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=mistral

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LiveKit
LIVEKIT_URL=wss://livekit.glorycast.ai
LIVEKIT_API_KEY=CHANGE_ME
LIVEKIT_API_SECRET=CHANGE_ME

# Frontend
FRONTEND_URL=https://app.glorycast.ai
ENV

chown $DEPLOY_USER:$DEPLOY_USER $APP_DIR/.env.prod.example
echo ""
echo "✅ Server setup complete."
echo ""
echo "Next steps:"
echo "  1. Copy .env.prod.example to .env and fill in secrets"
echo "  2. Clone GloryCast repo to $APP_DIR"
echo "  3. Set up SSL: certbot --nginx -d api.glorycast.ai"
echo "  4. Run: docker compose -f .../docker-compose.yml -f .../docker-compose.prod.yml up -d"
echo "  5. Run: docker compose exec api npx prisma migrate deploy"
echo "  6. Run: docker compose exec api npx prisma db seed"
