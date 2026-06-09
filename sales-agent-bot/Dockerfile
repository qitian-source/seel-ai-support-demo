# Seel Sales Assistant — Slack bot (Socket Mode worker)
# Runs the TypeScript entrypoint directly via tsx; no build step needed.
FROM node:20-slim

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Install deps first (better layer caching). Need devDeps too — tsx runs the TS.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# App source
COPY . .

# Socket Mode needs no inbound port; this is a long-running worker.
CMD ["pnpm", "start"]
