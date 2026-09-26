# Recruitment Platform

## Run the production-like local stack

Requirements: Docker Desktop with Docker Compose, at least 8 GB available memory, and free local ports listed below.

1. Copy `.env.example` to `.env`.
2. Replace every credential placeholder. `INTERNAL_API_TOKEN` and `GRAFANA_ADMIN_PASSWORD` must be non-empty, high-entropy local values.
3. Build and start from the repository root:

```powershell
docker compose config
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --tail 200
```

The local development RSA key under `Services/auth-service/src/main/resources/keys` is for local verification only. The Auth image excludes the private key and Compose mounts it read-only at runtime. Use externally managed keys for any deployment.

## Local URLs

| Component | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| RabbitMQ Management | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |
| Mailpit | http://localhost:8025 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

RabbitMQ, MinIO and Grafana use the credentials from `.env`. Domain services are reachable only inside `recruitment-network`. PostgreSQL, Redis, RabbitMQ AMQP and MinIO API remain exposed for local diagnostics; change or remove those port mappings outside local development. Redis is reserved for future rate limiting/cache work and is not a runtime dependency of the services.

The frontend serves static assets through unprivileged Nginx. Browser API calls use same-origin `/api/**`, which Nginx proxies to `api-gateway:8080`; Docker-only hostnames never reach the browser.

## Operations

View one service:

```powershell
docker compose logs -f application-service
docker compose restart notification-service
```

Stop containers while preserving databases, objects, messages and dashboards:

```powershell
docker compose down
```

Named volumes are intentionally retained. A complete reset deletes all local platform data and must only be run after confirming that data can be discarded:

```powershell
docker compose down -v
```

The PostgreSQL initialization script runs automatically only for a new PostgreSQL volume. Flyway in each service owns its database schema. MinIO initialization creates the private `recruitment-cvs` bucket deterministically.

## Observability

Spring services expose only health, info and Prometheus Actuator endpoints. Prometheus scrapes all six services over the internal Docker network. Grafana provisions its Prometheus datasource and the **Recruitment Platform Overview** dashboard automatically. Application logs go to stdout/stderr and include timestamp, level, service name and correlation ID where the request filters populate it. Loki was omitted because safe Docker log collection here would otherwise require mounting the Docker socket or broad host paths.

## Troubleshooting

- **Port conflict:** change the corresponding port in `.env`, then recreate the affected container.
- **Docker Desktop unavailable:** ensure `docker version` shows both Client and Server.
- **Unhealthy container:** run `docker compose ps` and `docker compose logs --tail 200 <service>`; health checks use readiness endpoints rather than fixed sleeps.
- **Old database volume or Flyway failure:** inspect the service and PostgreSQL logs before resetting anything. Only use the documented destructive reset when all local data may be deleted.
- **Frontend calls the wrong API:** production Compose uses same-origin `/api`; do not inject a Docker hostname into the browser bundle.
- **RabbitMQ or MinIO unavailable:** wait for their health checks and inspect `rabbitmq`, `minio`, and `minio-init` logs.
- **Metrics missing:** open Prometheus `/targets`, confirm every service target is up, then check `/actuator/prometheus` from inside the Compose network.
