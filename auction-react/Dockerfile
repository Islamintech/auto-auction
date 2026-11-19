# ---- Build stage: the React app ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY . .
# Baked into the bundle at build time (CRA). Passed by deploy/docker-compose.yml.
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    GENERATE_SOURCEMAP=false
RUN yarn build

# ---- Runtime: small Express server with per-page SEO (server/index.js) ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080
COPY server/package.json server/
RUN cd server && npm install --omit=dev && npm cache clean --force
COPY server/ server/
COPY src/seo/pages.json src/seo/pages.json
COPY --from=build /app/build build
RUN chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "server/index.js"]
