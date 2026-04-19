# Tower — production image (Next.js standalone). Build from monorepo root:
#   docker build -f apps/tower/Dockerfile -t codalyn-tower:latest .

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/webflow-kit ./packages/webflow-kit
COPY apps/tower ./apps/tower
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codalyn/webflow-kit build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @codalyn/tower build

FROM base AS runner
LABEL org.opencontainers.image.title="codalyn-tower"
LABEL org.opencontainers.image.description="Codalyn Tower — Next.js Webflow API gateway"
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/apps/tower/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/tower/.next/static ./apps/tower/.next/static

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/tower/server.js"]
