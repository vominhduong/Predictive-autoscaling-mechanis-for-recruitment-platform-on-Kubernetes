# PROMPT 08 — APPLICATION SERVICE VÀ RECRUITMENT STATE MACHINE

Đọc rules/docs/progress; User/Job pass. Chỉ làm Application Service/route tối thiểu.

## Schema/domain

Port 8084, `application_db`, Flyway/JPA/Security/Actuator/OpenAPI. Application lưu job/candidate/employer/company logical IDs, cvId, CV object key/job title/candidate identity snapshots, cover letter, status, timestamps/version. Unique(candidate,job). History lưu from/to/changedBy/note/time. Không truy cập DB khác.

## Apply

`POST /applications` chỉ Candidate. Không tin cvUrl client: nhận jobId/cvId; gọi Job eligibility, gọi User CV ownership; lưu snapshot + APPLIED trong transaction. Pre-check cho UX và unique constraint cho concurrency; duplicate 409. External calls không nằm trong DB transaction lâu hơn cần thiết.

## Query/status

Candidate list/detail chỉ của mình; Employer list theo Job chỉ khi sở hữu. Pagination/sort whitelist. PATCH status theo state machine: APPLIED→SCREENING/REJECTED; SCREENING→INTERVIEW/REJECTED; INTERVIEW→OFFER/REJECTED; OFFER→HIRED/REJECTED. Terminal không đổi; mọi transition lưu history; optimistic locking và note validation.

## Resilience/tests

Job/User calls timeout; circuit breaker; retry giới hạn GET idempotent; dependency unavailable 503, không tạo Application nửa chừng. Tests: ownership/role, invalid Job/CV, snapshot bất biến, duplicate sequential/concurrent, transition/history, terminal, optimistic conflict, timeout/fallback. Testcontainers + stub providers. Verify và manual E2E qua Gateway; báo và dừng.

