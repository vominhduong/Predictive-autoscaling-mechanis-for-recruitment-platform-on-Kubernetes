# PROMPT 02 — AUTH FOUNDATION, FLYWAY VÀ DOMAIN

Đọc rules/docs/progress và xác minh Prompt 01 pass. Chỉ sửa `Services/auth-service` và `.env.example` khi cần; không làm Register/Login/JWT.

## Kiểm tra trước

Đọc `pom.xml`, package gốc, resources, tests và migration hiện có. Giữ Spring Boot version nếu hợp lệ; dependency phải được BOM quản lý. Báo trước nếu Boot/Java không tương thích.

## Cấu hình

- Java 21, Maven Wrapper; Web, Security, JPA, Validation, Actuator, PostgreSQL, Flyway, Lombok, Testcontainers.
- `application.yml` name/port 8081/profile; local datasource dùng env; test datasource do Testcontainers cấp.
- Hikari cấu hình hợp lý; UTC; `open-in-view=false`; `ddl-auto=validate`; Flyway enabled/validate/clean-disabled.
- Không dùng H2 để thay PostgreSQL integration test; không hard-code production credential.

## Migration

V1 tạo `users`: UUID PK, lowercase-email unique index, password_hash, role/status varchar, email_verified, timestamps, version. `refresh_tokens`: UUID PK, user FK cascade delete, token_hash unique, expiry/revoke/create time và indexes. Không PostgreSQL enum, không seed Admin, không `IF NOT EXISTS`. Nếu V1 đã chạy, tuyệt đối không sửa checksum; tạo V2.

## Java domain

- `UserRole`: CANDIDATE/EMPLOYER/ADMIN; `UserStatus`: ACTIVE/LOCKED/DISABLED.
- Entity UUID sinh tại app/Hibernate, enum STRING, `@Version`, protected no-args, không `@Data`, không password trong toString/equals.
- RefreshToken→User LAZY, không cascade ALL; helper `isExpired/isRevoked` nếu có Clock/testable time.
- Repository: email ignore-case/exists; token hash; user tokens; lock query phục vụ rotation sau này.
- Package rõ: config/entity/enums/repository/dto/service/security/exception.

## Security tối thiểu và test

Stateless, disable CSRF/form/basic; health/info public, endpoint khác protected; chưa tạo JWT giả. Test Flyway schema, unique email case-insensitive, repository query, FK và health bằng PostgreSQL Testcontainers. Chạy `mvnw.cmd clean verify`, khởi động local và kiểm tra `\dt`, Flyway history.

## Hoàn thành

Build/test pass; schema khớp Entity; không API nghiệp vụ. Báo file, migration, tables/index/constraints, test result và dừng.

