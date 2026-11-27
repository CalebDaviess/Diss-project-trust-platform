# ── Stage 1: Build React + Vite SPA ───────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src

# Route API requests through Nginx (/api -> accountability-service:8081) so the
# UI works on any host/port without CORS issues, and prefill demo credentials.
ARG VITE_API_BASE_URL=/api
ARG VITE_DEMO_USERNAME=player@example.com
ARG VITE_DEMO_PASSWORD=demo-password
ARG VITE_ENABLE_DEMO_CONTROLS=true

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_DEMO_USERNAME=${VITE_DEMO_USERNAME} \
    VITE_DEMO_PASSWORD=${VITE_DEMO_PASSWORD} \
    VITE_ENABLE_DEMO_CONTROLS=${VITE_ENABLE_DEMO_CONTROLS}

RUN npm run build

# ── Stage 2: Serve static SPA + reverse-proxy /api to backend ─────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1
