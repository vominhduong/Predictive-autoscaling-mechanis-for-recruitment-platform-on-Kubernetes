# PROMPT 03 — RESPONSE, EXCEPTION VÀ REGISTER

Đọc rules/docs/progress; Prompt 02 phải pass. Chỉ làm Auth Service; chưa Login/JWT/RabbitMQ.

## Response/error contract

Tạo `ApiResponse<T>` (success/message/data/timestamp), `ApiErrorResponse` (success=false/code/message/fieldErrors/traceId/timestamp), field error và ErrorCode có HTTP status/default message. Global handler xử lý Bean Validation, constraint validation, malformed JSON, business exception, unique conflict, access denied và unknown error. Unknown error log stack với traceId nhưng client nhận message chung. Không phản chiếu password/token/rejected secret.

## Register API

`POST /api/v1/auth/register` request email/password/role. Email not blank/email/max255, trim/lowercase bằng Locale.ROOT. Password 8–72, hoa/thường/số/ký tự đặc biệt. Role not null và chỉ CANDIDATE/EMPLOYER; ADMIN luôn bị từ chối.

Service dùng constructor injection, `@Transactional`, kiểm tra exists, BCrypt, tạo ACTIVE/emailVerified=false, save và trả DTO gồm id/email/role/status/emailVerified/createdAt. Không trả Entity/password/hash/version. Duplicate phải trả 409 cả pre-check và `DataIntegrityViolationException` race. Controller trả 201; không publish profile event ở task này.

Security permit register/health; không mở wildcard `/auth/**`. Không log body hoặc password.

## Test bắt buộc

- Unit service: Candidate/Employer success, normalization, BCrypt, duplicate, ADMIN, DB race.
- MockMvc: 201/400/409, từng password rule, malformed role/JSON, response schema và không có secret.
- PostgreSQL Testcontainers: Flyway thật, lưu lowercase/hash, duplicate khác case bị chặn.
- Test độc lập, không DB development, không mock repository trong integration test.

Chạy `clean verify`, sau đó manual register bằng PowerShell/curl và query DB xác nhận hash. Báo endpoint mẫu, file đổi, số test/pass-fail, manual result; cập nhật progress và dừng.

