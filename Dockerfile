FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS verify
COPY . .
RUN node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/*.test.ts
RUN npm run lint

FROM verify AS build
# Vite values are public build-time settings; local .env files are excluded from the context.
RUN --mount=type=secret,id=frontend_env,required=true \
    set -a && . /run/secrets/frontend_env && set +a && npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY deploy/container.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
