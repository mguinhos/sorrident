FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--no-deprecation

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--no-deprecation \
    API_INTERNO=http://127.0.0.1:8000 \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD node -e "const port = process.env.PORT || '3000'; fetch('http://127.0.0.1:' + port).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "exec ./node_modules/.bin/next start -H 0.0.0.0 -p \"${PORT:-3000}\""]
