# ---- Build stage ----
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Compiled JS + copied views/public assets
COPY --from=build /app/dist ./dist
# Persisted on a mounted volume in production (see docker run -v).
# Owned by the non-root "node" user so uploads are writable at runtime.
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 3000
# Container-level liveness probe hitting the app's /health endpoint.
# Uses $PORT (injected by the host, e.g. Railway) and falls back to 3000.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1
CMD ["node", "dist/server.js"]
