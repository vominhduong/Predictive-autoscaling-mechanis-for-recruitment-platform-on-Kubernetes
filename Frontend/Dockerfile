FROM node:24.13.0-alpine3.22 AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29.1-alpine
COPY --from=build --chown=101:101 /workspace/dist/ /usr/share/nginx/html/
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
