# PROMPT 04 — LOGIN, JWT, REFRESH VÀ LOGOUT

Đọc rules/docs/progress; Register phải pass. Chỉ làm Auth Service.

## Login

`POST /api/v1/auth/login`. Normalize email; email không tồn tại và password sai cùng `401 INVALID_CREDENTIALS`; không tiết lộ account. LOCKED/DISABLED dùng error code đúng. PasswordEncoder.matches, không tự hash rồi so chuỗi.

## JWT

Dùng RS256 qua một thư viện tương thích hiện có, không chồng nhiều JWT library. Claims: `sub` user UUID, email, role, issuer, iat, exp, jti; expiry mặc định 30 phút qua env. Auth giữ private key, Gateway/service chỉ public key. Development key được ghi rõ là local; không commit production private key. Validate signature/issuer/expiry; không log token.

## Refresh Token

Opaque URL-safe random ≥256-bit, raw chỉ trả client một lần; DB lưu SHA-256 hash. Login trả access/refresh/tokenType/expiresIn/refreshExpiresIn. `POST /refresh`: hash→lock record→validate revoke/expiry/user status→revoke old→create new→new access, toàn bộ transaction. Hai concurrent request cùng token chỉ một thành công. `POST /logout` hash và revoke idempotent, không tiết lộ token tồn tại.

## Security

Stateless, no CSRF/form/basic. Public register/login/refresh/health; logout theo contract. Chuẩn hóa AuthenticationEntryPoint/AccessDenied JSON. Không dùng Redis trong MVP này.

## Tests

Credentials/status; claims/signature/tamper/expiry/issuer; DB không raw token; rotation, replay, expired/revoked/random token, concurrent refresh, logout/repeated logout; integration end-to-end với PostgreSQL Testcontainers và RSA test keys. Không sleep cứng; inject Clock nếu cần.

Chạy `clean verify`, manual register→login→refresh→old-token fail→logout→refresh fail. Báo file, config env, test/manual result, security limitations; cập nhật progress và dừng.

