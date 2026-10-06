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

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app /app
RUN npm prune --omit=dev
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["sh", "-c", "node scripts/prisma.mjs migrate deploy && node dist/src/main.js"]
