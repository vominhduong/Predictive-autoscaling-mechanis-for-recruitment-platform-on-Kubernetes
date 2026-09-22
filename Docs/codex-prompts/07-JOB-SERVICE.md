# PROMPT 07 — JOB SERVICE, SEARCH VÀ ELIGIBILITY

Đọc rules/docs/progress; User Service pass. Chỉ làm Job Service và route tối thiểu.

## Foundation/schema

Port 8083, `job_db`, Flyway/JPA validate/Security/Actuator/OpenAPI. Tables categories, locations, jobs với companyId/createdBy logical IDs, content, salary min/max/negotiable, category/location, deadline, status, publishedAt, timestamps, version. Add indexes cho public status/date, company, filters; không FK xuyên DB.

## Business/API

Admin CRUD Category/Location. Employer tạo Job DRAFT sau khi gọi User internal API xác minh Company permission. Owner mới sửa/publish/close. Validate salary range/deadline/required fields. Publish chỉ từ DRAFT; close từ DRAFT/PUBLISHED; chỉ hard-delete DRAFT; public GET chỉ PUBLISHED chưa hết hạn.

Search `GET /jobs`: keyword/location/category/salaryMin/page/size/sort; Spring Data Specification; size max, sort whitelist, default createdAt desc; response Page DTO, không Entity. Không thêm Elasticsearch.

Internal eligibility trả eligible/status/deadline và Job/Company/Employer snapshot cho Application; không route public.

## Resilience/tests

User call có timeout và lỗi rõ; retry chỉ GET an toàn. Test admin role, Company permission, ownership, state transition, salary/deadline, expiry, pagination/filter/sort injection, optimistic lock và provider unavailable. PostgreSQL Testcontainers + stub contract. Chạy verify và manual Company→DRAFT→PUBLISHED→search; báo kết quả và dừng.

