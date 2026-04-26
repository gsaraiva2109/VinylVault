FROM node:25-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci
COPY . .
# NEW: Bundle almost everything into dist/server.js
RUN npm run bundle
# Removed redundant npm prune since we only explicitly copy specific files
FROM node:25-alpine AS production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Only copy what is absolutely necessary
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/drizzle ./drizzle
COPY package*.json ./

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Hardened healthcheck using Node.js instead of wget
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
