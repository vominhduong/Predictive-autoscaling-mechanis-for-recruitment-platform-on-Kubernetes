# PROMPT 09 — RABBITMQ, NOTIFICATION VÀ OUTBOX

Đọc rules/docs/progress; core flow pass. Chỉ làm messaging, Notification Service và producer changes cần thiết.

## Topology/contract

Topic exchange `recruitment.events`; routing `user.registered`, `application.submitted`, `application.status-changed`; durable queues, retry strategy và DLQ. Versioned envelope gồm eventId UUID, type, occurredAt, schemaVersion, producer, data; không password/token/full CV.

## Producers

Auth phát UserRegistered sau account; Application phát submitted/status-changed. Trước tiên làm flow cơ bản có confirm/return handling. Sau khi pass, thêm outbox table/migration cho từng producer: aggregate/type/payload/status/attempt/created/sent; business+outbox cùng transaction; scheduled publisher lock batch, publish, mark sent; retry/backoff và cleanup policy. Không sửa migration cũ.

## Notification

Port 8085, `notification_db`; consume events, unique processed event/eventId, notification log, render email, SMTP Mailpit. Idempotency phải ngăn redelivery gửi trùng. Retry lỗi tạm thời; permanent invalid event vào DLQ với log an toàn. Không làm API request chờ gửi email.

## Tests

RabbitMQ/PostgreSQL Testcontainers: routing, schema, publish confirm, retry/DLQ, duplicate delivery, consumer crash boundary, outbox recovery và email Mailpit/mock SMTP. Async assertion polling có timeout, không sleep cứng. Manual Apply/status phải thấy đúng số email. Báo topology, event samples, failure evidence, tests; dừng.

