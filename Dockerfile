# syntax=docker/dockerfile:1
# Multi-stage build: the runtime image contains only the build output and production dependencies.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG SITE_URL=https://www.karensrealestate.nl
ENV SITE_URL=$SITE_URL
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=4321 HOST=0.0.0.0 DATA_DIR=/app/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server.mjs ./
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 4321
VOLUME ["/app/data"]
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:4321/api/health/ || exit 1
CMD ["node", "server.mjs"]
