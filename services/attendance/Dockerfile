# This Dockerfile is designed to be built from the root of the monorepo
# Usage: docker build -t attendance -f services/attendance/Dockerfile .

# Base image with pnpm
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm install -g turbo

# Pruning stage
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @jaga-id/attendance --docker

# Installer stage
FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN turbo build --filter=@jaga-id/attendance

# Runner stage — use a fresh npm install for clean, flat node_modules
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SERVICE_NAME=attendance

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package.json and built code
COPY --from=builder --chown=nodejs:nodejs /app/services/attendance/package.json .
COPY --from=builder --chown=nodejs:nodejs /app/services/attendance/dist ./dist

# Install production dependencies cleanly (flat node_modules, no symlinks)
RUN npm install --omit=dev

USER nodejs

EXPOSE 3003

CMD ["node", "dist/index.js"]
