FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma.config.ts ./prisma.config.ts
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/api ./apps/api
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run db:generate && npm run build -w @oyla/api

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace @oyla/api --include-workspace-root --omit=dev && npm cache clean --force
COPY prisma.config.ts ./prisma.config.ts
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/generated ./apps/api/generated
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma
COPY apps/api/prisma/migrations ./apps/api/prisma/migrations
COPY apps/api/scripts ./apps/api/scripts
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["sh", "-c", "node scripts/prisma.mjs migrate deploy && node dist/src/main.js"]
