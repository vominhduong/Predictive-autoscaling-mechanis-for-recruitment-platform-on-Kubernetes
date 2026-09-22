# PROMPT 06 — USER SERVICE, COMPANY VÀ CV

Đọc rules/docs/progress; Gateway/Auth pass. Chỉ làm User Service và route/config tối thiểu.

## Foundation/schema

Port 8082, `user_db`, Flyway/JPA validate, Security resource server hoặc identity verification theo kiến trúc đã chốt, Actuator/OpenAPI, MinIO adapter. Tables: candidate_profiles(user unique), companies, company_members unique(company,user) role OWNER/RECRUITER, cvs với candidate/object key/type/size/default/timestamps; indexes/constraints. Không lưu credential Auth.

## API

- `GET/PUT /candidates/me`: dùng authenticated user, không nhận userId tùy ý.
- Company create/get/update và add member. Creator là OWNER; chỉ member có permission sửa; public response không lộ dữ liệu nội bộ.
- CV multipart upload/list/delete: chỉ PDF, kiểm MIME + signature/header nếu khả thi + extension, max size env; object key UUID an toàn; filename chỉ metadata; private bucket/presigned access khi cần.

Đảm bảo DB/object storage nhất quán: nếu upload DB fail thì dọn object; delete xử lý có chiến lược retry/compensation. Không cho đọc/xóa CV người khác.

## Internal contracts

Endpoint nội bộ CV validation trả ownership và immutable snapshot cần cho Application; Company authorization trả quyền Employer. Không expose qua Gateway; có cơ chế tin cậy nội bộ phù hợp, không chỉ dựa client header.

## Tests

Migration/repository; profile ownership; Company member roles; invalid type/oversize; object-key traversal; storage failure compensation; CV ownership; internal contract. Testcontainers PostgreSQL và MinIO hoặc adapter integration rõ ràng. `clean verify`; manual flow qua Gateway. Báo schema/API/storage/test và dừng.

