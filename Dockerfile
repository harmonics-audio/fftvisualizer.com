# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:24-slim AS build
WORKDIR /app

# Build tools for native deps. Docus/@nuxt/content pulls in better-sqlite3, which
# compiles from source when no prebuilt binary matches the Node version/platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Pin pnpm to match the packageManager field (corepack/nixpacks can lag behind)
RUN npm i -g pnpm@10.34.1

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile

# Cap the heap below the VPS total so a runaway build aborts instead of waking
# the kernel OOM killer.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build

# --- Runtime stage ---
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.output ./.output

EXPOSE 3000
# node -e fetch instead of curl/wget — node:24-slim ships neither, and Coolify
# needs an in-image HEALTHCHECK to report container health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Drop root privileges — node:24-slim ships a built-in non-root `node` user (UID 1000)
USER node
CMD ["node", ".output/server/index.mjs"]
