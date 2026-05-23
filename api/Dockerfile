FROM node:24-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@9

WORKDIR /app

# Copy lock file and package manifest first for layer caching
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm run bundle

FROM node:24-alpine AS production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Only copy what is necessary
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/drizzle ./drizzle
COPY package.json ./

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
