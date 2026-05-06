# syntax=docker/dockerfile:1
# Build arg selects which app to build: eagle-dev-console-frontend | eagle-end-user-panel
ARG BUILD_APP=eagle-dev-console-frontend

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
ARG BUILD_APP
ARG VITE_API_BASE_URL
ARG VITE_MICROSOFT_TENANT_ID

WORKDIR /app

# Copy manifests first so npm ci layer is cached unless deps change
COPY package.json package-lock.json ./
COPY packages/eagle-widget-library/package.json ./packages/eagle-widget-library/
COPY apps/eagle-dev-console-frontend/package.json ./apps/eagle-dev-console-frontend/
COPY apps/eagle-end-user-panel/package.json        ./apps/eagle-end-user-panel/

RUN npm ci

# Copy full source (widget library + both apps)
COPY packages/ ./packages/
COPY apps/     ./apps/
COPY turbo.json ./

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MICROSOFT_TENANT_ID=$VITE_MICROSOFT_TENANT_ID

# Filter by package name (matches the name field in each app's package.json)
RUN npx turbo run build --filter=${BUILD_APP}...

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
ARG BUILD_APP

COPY --from=builder /app/apps/${BUILD_APP}/dist /usr/share/nginx/html

# SPA fallback: all routes serve index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
