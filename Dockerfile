FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun x next build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production \
  PORT=3000 \
  UPLOAD_ROOT=/data/uploads

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/db ./src/db
COPY package.json next.config.* tsconfig.json drizzle.config.ts ./
COPY public ./public

RUN mkdir -p /app/.next/cache/images /data/uploads \
  && chmod -R 777 /app/.next /data

EXPOSE 3000
CMD ["bun", "run", "start"]