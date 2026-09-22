# PROMPT 11 — CONTAINER HÓA VÀ OBSERVABILITY

Đọc rules/progress; application E2E pass. Chỉ làm container/telemetry, không đổi business contract.

## Docker

Mỗi Spring service multi-stage Maven→JRE, cache dependencies hợp lý, non-root user, deterministic base tag, `.dockerignore`, JVM container options, graceful shutdown và healthcheck. Frontend production build + server. Compose toàn stack dùng internal service DNS, dependency health, env, named volumes; chỉ Gateway/frontend và tool UI cần thiết expose host. Không bake keys/secrets, không `latest` cho release, không xóa volume.

## Health/metrics/log/trace

Actuator health/readiness/liveness/prometheus; Hikari/JVM/HTTP metrics. Structured JSON log có timestamp/level/service/traceId/spanId/correlation; redact token/password/CV. Prometheus+Grafana; Loki hoặc log stack; OTel Collector + Tempo/Jaeger. Propagate trace qua Gateway, REST clients và RabbitMQ headers. Dashboard request rate, p95, 4xx/5xx, JVM, pool, RabbitMQ queue/DLQ.

## Verification

`docker compose build`, `up`, `ps`; clean smoke E2E. Xác minh restart stateless container và persistence stateful. Thực hiện một Apply, tìm cùng trace xuyên Gateway/Application/Job/User/producer/consumer; kiểm metrics/log redaction. Không public actuator nhạy cảm. Báo images, ports, dashboards, trace evidence, resource use/blockers; dừng.

