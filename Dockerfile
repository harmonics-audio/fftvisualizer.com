# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:24-slim AS build
WORKDIR /app

# Build tools for native deps. Docus/@nuxt/content pulls in better-sqlite3, which
# compiles from source when no prebuilt binary matches the Node version/platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Pin pnpm to match the packageManager field (corepack/nixpacks can lag behind)
RUN npm i -g pnpm@11.9.0

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile

# Docus's assistant module decides at BUILD time whether the AI button exists: its
# setup() reads process.env.AI_GATEWAY_API_KEY and, when unset, registers disabled
# component stubs and skips the /__docus__/assistant route entirely. It only tests
# presence, never validity, so a placeholder suffices here — the real key is injected
# at runtime by Coolify, where the AI SDK gateway reads it per request. That also
# keeps the secret out of the build stage and its layer history.
ARG AI_GATEWAY_API_KEY=enabled-at-runtime
ENV AI_GATEWAY_API_KEY=$AI_GATEWAY_API_KEY

# Cap the heap below the VPS total so a runaway build aborts instead of waking
# the kernel OOM killer.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build

# --- Runtime stage ---
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

# --chown is load-bearing: @nuxt/content's node-server preset creates its SQLite
# content DB lazily, on the first *runtime* query, at .output/server/contents.sqlite
# (the relative `database.filename` resolves against the server chunk, not cwd).
# Copied as root it is unwritable by USER node below, so the dump import fails and
# every runtime content query — /mcp's list-pages and get-page — 500s. Prerendered
# pages, /raw/*.md and llms.txt are unaffected, which is what makes it easy to miss.
COPY --from=build --chown=node:node /app/.output ./.output

EXPOSE 3000
# node -e fetch instead of curl/wget — node:24-slim ships neither, and Coolify
# needs an in-image HEALTHCHECK to report container health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Drop root privileges — node:24-slim ships a built-in non-root `node` user (UID 1000)
USER node
CMD ["node", ".output/server/index.mjs"]
