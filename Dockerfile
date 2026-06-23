# ===================== 多阶段构建 =====================
# 阶段1: 安装依赖
FROM node:24-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prefer-offline 2>/dev/null || pnpm install --prefer-offline

# 阶段2: 构建应用
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm next build
RUN pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# 阶段3: 生产运行
FROM node:24-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 创建 SQLite 数据目录
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# 复制 CLI 工具和脚本
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/storage/database/sqlite-client.ts ./src/storage/database/sqlite-client.ts
COPY --from=builder /app/src/storage/database/shared/schema.ts ./src/storage/database/shared/schema.ts
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/hooks/use-data.ts ./src/hooks/use-data.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# 安装 CLI 运行所需的最小依赖
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 5000

ENV HOSTNAME="0.0.0.0"
ENV SQLITE_DB_PATH=/app/data/ledger-crm.db

VOLUME ["/app/data"]

CMD ["node", "dist/server.js"]
