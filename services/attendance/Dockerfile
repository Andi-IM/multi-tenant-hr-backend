FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm install -g turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @jaga-id/attendance --docker

FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN turbo build --filter=@jaga-id/attendance

# Use pnpm to install only production dependencies in a separate stage
FROM base AS prod-installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Use shamefully-hoist to flatten node_modules, making it easier to copy and run
RUN pnpm install --prod --frozen-lockfile --shamefully-hoist

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy node_modules from the prod-installer stage
COPY --from=prod-installer --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy the build artifacts from the builder stage
# We copy them into the service directory to maintain the structure
COPY --from=builder --chown=nodejs:nodejs /app/services/attendance/package.json ./services/attendance/package.json
COPY --from=builder --chown=nodejs:nodejs /app/services/attendance/dist ./services/attendance/dist

USER nodejs

EXPOSE 3003

# Run from the root but pointing to the service's dist
CMD ["node", "services/attendance/dist/index.js"]
