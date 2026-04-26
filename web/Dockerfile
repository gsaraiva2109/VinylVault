FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# NEXTAUTH_SECRET is a runtime secret — do NOT set a fallback here.
# Provide it via the container's environment at runtime.
ENV NEXT_OUTPUT=standalone
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    pnpm build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
