# PROMPT 12 — CI/CD, KUBERNETES VÀ RELEASE

Đọc rules/docs/progress; Compose E2E pass. Chỉ làm pipeline/deploy/release docs; không thay đổi nghiệp vụ nếu không có lý do và test.

## CI/CD

GitHub Actions matrix/path-aware: Maven `clean verify`, frontend lint/typecheck/test/build, Testcontainers, reports/coverage, dependency and container scan. Build images immutable commit SHA; push chỉ branch/tag quy định và khi secrets có; PR không deploy production. Dùng Secrets/OIDC, least privilege, concurrency/cancel, cache an toàn. CD có environment approval, migration/deploy order, rollout wait, smoke test và rollback.

## Kubernetes/Helm

Tạo chart/manifests cho namespace, Deployments, Services, Ingress Gateway/frontend, ConfigMap, Secret references, service accounts, probes, requests/limits, rolling update, PDB và HPA cho stateless. NetworkPolicy: chỉ Gateway public, internal/DB hạn chế. Stateful services dùng PVC và ghi rõ dev single-node khác production managed/HA. Values dev/prod; không plaintext secret. `helm lint`, render/schema validation; deploy kind/minikube nếu có và không giả vờ đã xác minh nếu thiếu cluster.

## Release/security/operations

Kiểm JWT issuer/audience/key rotation, CORS, rate limit login/register, upload security, non-root/scan. Viết backup/restore DB+object, Flyway rollout, install/upgrade/rollback, incident/log locations. Final test từ clean environment: register roles, Company, Job, CV, search/apply, duplicate 409, transitions, email idempotent, telemetry, restart persistence.

## Bàn giao

Tạo `docs/release-checklist.md` và final report: versions/image digests, environment variables, commands, URLs, CI evidence, Helm results, backup/rollback, known limitations/backlog. Chỉ đánh dấu hoàn thành cho bước đã chạy có evidence; dừng và bàn giao.

