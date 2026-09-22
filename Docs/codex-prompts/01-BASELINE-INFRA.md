# PROMPT 01 — BASELINE VÀ HẠ TẦNG LOCAL

Bạn đang làm task đầu tiên của Recruitment Platform. Đọc `docs/codex-prompts/00-CODEX-USAGE-RULES.md`, toàn bộ `docs/01-...` đến `05-...`, `git status` và repository trước khi sửa. Chỉ làm hạ tầng; không code Spring service.

## Mục tiêu

Chuẩn hóa repository và tạo môi trường development có PostgreSQL, Redis, RabbitMQ, MinIO, Mailpit chạy ổn định bằng một Docker Compose.

## Kiểm tra trước

- Liệt kê file hiện có, Docker/Compose version, port đang dùng và thay đổi chưa commit.
- Kiểm tra `infrastructure/docker-compose.yml`, `.env.example`, `.gitignore`, init SQL và README. Không ghi đè cấu hình đúng.
- Không đọc/in secret ra output; không sửa `.env`; không chạy `down -v`, prune hoặc xóa volume/image ngoài phạm vi.

## Yêu cầu triển khai

- Một PostgreSQL container, named volume, healthcheck; init các DB `auth_db`, `user_db`, `job_db`, `application_db`, `notification_db`.
- Redis có volume và PING healthcheck.
- RabbitMQ Management có AMQP 5672/UI 15672, volume và diagnostics healthcheck.
- MinIO API 9000/Console 9001, volume, healthcheck; dùng image thực sự chạy server, không dùng Helm chart OCI.
- Mailpit SMTP 1025/UI 8025.
- Tất cả trên `recruitment-network`; credential/port qua environment; restart policy cho local.
- `.env.example` chứa placeholder an toàn. `.gitignore` phải loại `.env`, keys, logs, IDE/build output.
- README nêu lệnh Windows PowerShell: copy env, config, pull, up, ps, logs, stop; kết nối từ host và từ Docker network; cảnh báo lệnh xóa volume.

## Xác minh

Chạy `docker compose --env-file .env -f infrastructure/docker-compose.yml config`, `up -d`, `ps`. Kiểm tra DB bằng psql, Redis PING, RabbitMQ/MinIO/Mailpit UI. Nếu init SQL không chạy vì volume cũ, không xóa volume; kiểm tra rồi tạo DB thiếu an toàn.

## Acceptance criteria

Compose hợp lệ; container healthy/running; 5 DB tồn tại; dữ liệu giữ sau restart; không secret trong Git. Cập nhật progress với file đổi, output kiểm tra, port/URL và blocker. Dừng, không tạo Auth Service.

