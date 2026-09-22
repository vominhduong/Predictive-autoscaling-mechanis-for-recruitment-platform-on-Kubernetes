# PROMPT 05 — API GATEWAY VÀ JWT VERIFICATION

Đọc rules/docs/progress; Auth phải hoàn chỉnh. Chỉ sửa `Services/api-gateway`, `.env.example` và route docs cần thiết.

## Foundation

Kiểm tra Boot version; chọn Spring Cloud BOM tương thích, không đoán. Gateway dùng WebFlux/Netty, Actuator và OAuth2 Resource Server/Jose nếu phù hợp; không Spring MVC/JPA/Flyway/Feign/Eureka. Port 8080. Service URI từ env, local localhost, Docker service name khi override; không `lb://`.

## Routing

Giữ nguyên `/api/v1/...`: auth→8081, candidates/companies→8082, jobs/admin categories/locations→8083, applications/employer applications→8084. Không route `/internal/**`. Route ID rõ, tránh route admin chung mơ hồ.

## Cross-cutting

- Connect timeout 3s, response 5s; chưa retry write.
- Correlation header hợp lệ hoặc UUID, trả response; log method/path/status/duration, không body/Auth/Cookie.
- Xóa client-supplied `X-User-*` trước xử lý.
- CORS origin local cấu hình được; methods/headers cần thiết; preflight pass; không wildcard+credentials.
- WebFlux error handler cho 404/503/504/500 theo contract, không lộ internal URL.

## Security

Verify RS256 bằng public key, issuer/audience nếu Auth phát hành. Public register/login/refresh, health, GET public Job/Company; endpoint khác authenticated. Token thiếu/sai/hết hạn trả 401; role/access 403. Sau verify gắn userId/email/role/correlation xuống upstream; client không giả mạo.

## Tests/verification

WebTestClient + mock upstream: path/method/body giữ nguyên, headers, CORS, correlation, spoofing, public/protected, JWT valid/tampered/expired, unavailable/timeout. Không cần service thật trong automated tests. `clean verify`; manual register/login qua 8080 và protected call. Báo version matrix, route table, test result; cập nhật progress và dừng.

