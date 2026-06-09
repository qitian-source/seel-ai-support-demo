# Seel Sales Assistant — Slack bot (Socket Mode worker)
# Runs the TypeScript entrypoint directly via tsx; no build step needed.
FROM node:20-slim

WORKDIR /app

# Enable pnpm via corepack, pinned to the version that generated the lockfile
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Install deps first (better layer caching). Need devDeps too — tsx runs the TS.
# --frozen-lockfile = reproducible; esbuild build script is allowed via the
# package.json "pnpm.onlyBuiltDependencies" field so tsx works at runtime.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# App source
COPY . .

# Socket Mode needs no inbound port; this is a long-running worker.
CMD ["pnpm", "start"]
