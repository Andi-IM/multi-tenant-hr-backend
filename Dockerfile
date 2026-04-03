# Base image with pnpm
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm install -g turbo

# Pruning stage
FROM base AS pruner
ARG SERVICE_NAME
WORKDIR /app
COPY . .
RUN turbo prune @jaga-id/${SERVICE_NAME} --docker

# Installer stage
FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
ARG SERVICE_NAME
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN turbo build --filter=@jaga-id/${SERVICE_NAME}

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ARG SERVICE_NAME
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

COPY --from=builder /app/services/${SERVICE_NAME}/package.json .

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nodejs:nodejs /app/services/${SERVICE_NAME}/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/${SERVICE_NAME}/node_modules ./services/${SERVICE_NAME}/node_modules

# Default port
EXPOSE 3000

CMD ["node", "dist/index.js"]
