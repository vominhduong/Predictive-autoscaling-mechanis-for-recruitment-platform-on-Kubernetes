# Prompt 07 — Implement Job Service

## 1. Vai trò

Bạn đang tiếp tục phát triển Recruitment Platform sử dụng kiến trúc Microservices với Java 21, Spring Boot, PostgreSQL, Flyway, Docker Compose và API Gateway.

Hãy triển khai hoàn chỉnh Job Service theo code, convention, security contract, response contract và test strategy đã có trong repository.

Không chỉ tạo skeleton. Phải hoàn thiện migration, domain model, business rules, REST API, internal API, tìm kiếm, phân trang, authorization, test tự động và kiểm tra manual qua API Gateway.

---

## 2. Bắt buộc đọc trước khi thay đổi code

Đọc toàn bộ các tài liệu sau:

1. `docs/codex-prompts/00-CODEX-USAGE-RULES.md`
2. `docs/01-system-overview.md`
3. `docs/02-service-boundaries.md`
4. `docs/03-business-workflows.md`
5. `docs/04-database-design.md`
6. `docs/05-api-contracts.md`
7. `project-progress.md`
8. Code hiện tại của:
    - `Services/auth-service`
    - `Services/api-gateway`
    - `Services/user-service`
    - `Services/job-service`
9. Flyway migrations, error contract, correlation ID handling và test convention đã triển khai.

Nếu tài liệu và code mâu thuẫn:

- Không âm thầm lựa chọn.
- Ưu tiên contract đã được triển khai và xác minh ở Prompt 01–06 nếu không làm sai nghiệp vụ.
- Ghi rõ quyết định trong báo cáo cuối.
- Chỉ cập nhật tài liệu khi cần đồng bộ với quyết định đã được chứng minh.

---

## 3. Kiểm tra trạng thái trước khi code

Thực hiện và báo cáo ngắn:

```powershell
git status
git branch --show-current
git log -1 --oneline
```

Kiểm tra:

- Working tree có thay đổi chưa commit hay không.
- Job Service đang có những dependency và file nào.
- Gateway đã có route `/api/v1/jobs/**` hay chưa.
- `job_db` đã được Docker Compose tạo hay chưa.
- User Service internal Company authorization API có contract thực tế như thế nào.
- Standard API response/error contract hiện tại.
- Correlation ID header hiện tại.
- Cách Gateway truyền `X-User-Id`, `X-User-Email`, `X-User-Role`.

Không xóa hoặc ghi đè thay đổi không liên quan.

---

## 4. Phạm vi được phép thay đổi

Được phép thay đổi:

- `Services/job-service/**`
- Cấu hình route Job Service tối thiểu trong `Services/api-gateway/**`
- Tài liệu liên quan trực tiếp đến Job Service nếu contract thực tế cần đồng bộ
- `project-progress.md`
- `.env.example` nếu cần thêm biến cấu hình không chứa bí mật thật
- Docker Compose nếu cần khai báo Job Service, nhưng không triển khai toàn bộ container hóa production ở prompt này

Không được:

- Triển khai Application Service.
- Triển khai Notification Service.
- Triển khai frontend.
- Thêm Eureka hoặc service discovery.
- Thêm Elasticsearch trong MVP.
- Dùng Redis cho chức năng tìm kiếm Job.
- Truy cập trực tiếp `user_db` hoặc database của service khác.
- Tạo foreign key liên database.
- Tin tưởng `X-User-*` từ client nếu request không đi qua Gateway.
- Sửa migration Flyway đã được áp dụng; nếu cần thay đổi phải tạo migration mới.
- Refactor lớn Auth Service, Gateway hoặc User Service ngoài phạm vi cần thiết.
- Tự động commit hoặc push nếu chưa được yêu cầu trực tiếp.

---

## 5. Mục tiêu kỹ thuật

Job Service phải:

- Chạy ở port `8083`.
- Chỉ sở hữu và kết nối `job_db`.
- Dùng PostgreSQL.
- Dùng Flyway quản lý schema.
- Dùng Hibernate `ddl-auto=validate`.
- Dùng Spring Data JPA.
- Dùng Bean Validation.
- Dùng Spring Security phù hợp trusted-header architecture hiện tại.
- Dùng Actuator.
- Sinh OpenAPI/Swagger phù hợp Spring Boot 4.
- Không dùng Spring Cloud Gateway dependency trong Job Service.
- Không kết nối trực tiếp database của User Service.
- Có unit test và integration test với PostgreSQL Testcontainers.
- Tuân theo API response/error contract hiện tại.
- Giữ correlation/trace ID trong error response.

---

## 6. Domain model

### 6.1 Job

Job tối thiểu gồm:

- `id`: UUID
- `companyId`: UUID
- `createdBy`: UUID của Employer tạo tin
- `title`
- `description`
- `requirements`
- `locationId`
- `categoryId`
- `employmentType`
- `salaryMin`
- `salaryMax`
- `salaryCurrency`
- `salaryNegotiable`
- `status`
- `applicationDeadline`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `version`

Giá trị enum đề xuất:

`employmentType`:

- `FULL_TIME`
- `PART_TIME`
- `CONTRACT`
- `INTERNSHIP`
- `FREELANCE`

`status`:

- `DRAFT`
- `PUBLISHED`
- `HIDDEN`
- `CLOSED`

Không lưu Company entity hoặc User entity trong Job Service.

Chỉ lưu logical ID:

- `company_id`
- `created_by`

### 6.2 Category

Category tối thiểu gồm:

- `id`: UUID
- `name`
- `slug`
- `active`
- `createdAt`
- `updatedAt`

### 6.3 Location

Location tối thiểu gồm:

- `id`: UUID
- `name`
- `slug`
- `active`
- `createdAt`
- `updatedAt`

Category và Location thuộc Job Service trong MVP.

---

## 7. Flyway migration

Tạo migration đầu tiên nếu Job Service chưa có migration:

```text
V1__create_job_schema.sql
```

Migration phải tạo tối thiểu:

- `jobs`
- `job_categories`
- `job_locations`

Yêu cầu database:

- UUID primary key.
- NOT NULL hợp lý.
- Check constraint cho enum nếu project đang sử dụng kiểu varchar.
- `salary_min >= 0`.
- `salary_max >= 0`.
- Nếu cả hai có giá trị thì `salary_max >= salary_min`.
- Unique constraint cho category slug.
- Unique constraint cho location slug.
- Optimistic locking bằng cột `version` cho Job.
- Timestamps phù hợp.
- Index phục vụ:
    - `status`
    - `company_id`
    - `category_id`
    - `location_id`
    - `created_at`
    - `application_deadline`
    - tìm kiếm keyword hợp lý trong phạm vi PostgreSQL/JPA hiện tại

Không cần Elasticsearch.

Nếu seed Category/Location phục vụ local development hoặc test:

- Seed phải deterministic.
- Không trộn dữ liệu test vào production migration nếu không hợp lý.
- Có thể tạo migration seed riêng hoặc test fixture.

---

## 8. Authorization model

### 8.1 Public/Candidate

Public và Candidate được phép:

- Xem danh sách Job đang `PUBLISHED`.
- Xem chi tiết Job đang `PUBLISHED`.
- Tìm kiếm và lọc Job.

Public không được:

- Tạo Job.
- Cập nhật Job.
- Xóa/ẩn/đóng Job.
- Xem Job draft/hidden của Employer.

### 8.2 Employer

Employer được phép tạo Job khi:

- Request đã được Gateway xác thực.
- `X-User-Role = EMPLOYER`.
- Employer là thành viên hợp lệ của Company.
- Có quyền phù hợp theo internal Company authorization contract của User Service.
- Company tồn tại và đáp ứng điều kiện nghiệp vụ cần thiết.

Phải gọi User Service qua internal API, không đọc `user_db`.

Employer chỉ được:

- Sửa Job thuộc Company mình có quyền quản lý.
- Ẩn, publish hoặc đóng Job thuộc Company mình có quyền quản lý.
- Xem danh sách Job của Company nếu có quyền.

Không chỉ kiểm tra role `EMPLOYER`; phải kiểm tra Company authorization.

### 8.3 Admin

Nếu contract hiện tại hỗ trợ Admin:

- Admin có thể xem hoặc quản trị Job theo contract.
- Không tự mở rộng thêm API Admin ngoài tài liệu nếu chưa cần thiết.

### 8.4 Trusted headers

Job Service nhận identity từ Gateway:

- `X-User-Id`
- `X-User-Email`
- `X-User-Role`
- correlation ID header hiện có

Validate định dạng header.

Không cho public endpoint vô tình sử dụng identity do client tự gửi khi gọi trực tiếp service.

Trong local architecture, service port chỉ dành cho internal Docker network. Hãy tuân theo mô hình security đã thống nhất trong repository.

---

## 9. Kết nối User Service

Tạo client dành cho internal Company authorization.

Sử dụng đúng endpoint và DTO contract hiện có trong User Service. Không tự phỏng đoán nếu có thể đọc code thực tế.

Request đến User Service phải:

- Gửi internal service token qua header đã được User Service quy định.
- Có timeout.
- Forward correlation ID.
- Không log internal token.
- Không log dữ liệu bí mật.

Phân biệt các lỗi:

- Company không tồn tại.
- User không thuộc Company.
- User thuộc Company nhưng không đủ quyền.
- User Service unavailable.
- User Service timeout.
- Internal contract trả response không hợp lệ.

Mapping về error contract chuẩn, ví dụ:

- `COMPANY_NOT_FOUND`
- `COMPANY_ACCESS_DENIED`
- `UPSTREAM_SERVICE_UNAVAILABLE`
- `UPSTREAM_SERVICE_TIMEOUT`

Sử dụng đúng tên error code đang có nếu repository đã quy định.

Không thêm retry cho các mutation request một cách thiếu kiểm soát.

---

## 10. API bắt buộc

Đối chiếu `05-api-contracts.md` và giữ contract hiện hành. Nếu tài liệu thiếu chi tiết, triển khai tối thiểu các API dưới đây.

### 10.1 Public search

```http
GET /api/v1/jobs
```

Query parameters:

- `keyword`
- `locationId`
- `categoryId`
- `salaryMin`
- `employmentType`
- `page`
- `size`
- `sort`

Quy tắc:

- Chỉ trả Job `PUBLISHED`.
- Chưa quá hạn nộp đơn.
- Keyword tìm ít nhất trên title.
- Có thể tìm description nếu implementation an toàn và hợp lý.
- Filter có thể kết hợp.
- Mặc định sắp xếp mới nhất.
- Phân trang từ page 0.
- Giới hạn `size`, ví dụ tối đa 100.
- Không cho client truyền tùy ý tên property gây lỗi hoặc lộ implementation.
- Chỉ cho phép whitelist sort như:
    - `newest`
    - `oldest`
    - `salaryAsc`
    - `salaryDesc`

Response phải có metadata phân trang nhất quán với contract hiện tại.

### 10.2 Public Job detail

```http
GET /api/v1/jobs/{jobId}
```

Chỉ public Job khi:

- `status = PUBLISHED`
- chưa hết hạn, theo rule đã thống nhất

Nếu không public thì không làm lộ thông tin không cần thiết.

### 10.3 Employer creates Job

```http
POST /api/v1/jobs
```

Actor:

- `EMPLOYER`

Input tối thiểu:

- `companyId`
- `title`
- `description`
- `requirements`
- `locationId`
- `categoryId`
- `employmentType`
- `salaryMin`
- `salaryMax`
- `salaryCurrency`
- `salaryNegotiable`
- `applicationDeadline`

Business rules:

- Company authorization phải hợp lệ.
- Category phải tồn tại và active.
- Location phải tồn tại và active.
- Deadline phải nằm trong tương lai.
- Title, description, requirements phải có giới hạn độ dài.
- Salary không âm.
- `salaryMax >= salaryMin`.
- Nếu `salaryNegotiable = true`, xác định rõ salary min/max có được phép null hay bị bỏ qua.
- Không nhận `createdBy` từ client.
- Không nhận `status`, `createdAt`, `updatedAt`, `publishedAt` tùy ý từ client.

Theo BA ban đầu, trạng thái mặc định có thể là `PUBLISHED`. Tuy nhiên, hãy kiểm tra API contract và tài liệu hiện tại trước khi quyết định.

Nếu chọn mặc định `PUBLISHED`:

- Gán `publishedAt` ở server.
- Ghi rõ quyết định.

Nếu chọn mặc định `DRAFT`:

- Phải có endpoint publish và cập nhật tài liệu.
- Không âm thầm thay đổi business requirement.

### 10.4 Employer updates Job

```http
PUT /api/v1/jobs/{jobId}
```

Actor:

- Employer có quyền với Company sở hữu Job.

Quy tắc:

- Không được đổi `companyId`.
- Không được đổi `createdBy`.
- Validate lại toàn bộ dữ liệu.
- Dùng optimistic locking nếu contract hỗ trợ version.
- Không cho sửa Job của Company khác.
- Xử lý concurrent update hợp lý.

### 10.5 Employer changes status

Dùng endpoint đúng theo API contract. Nếu chưa có, sử dụng:

```http
PATCH /api/v1/jobs/{jobId}/status
```

Input:

```json
{
  "status": "PUBLISHED"
}
```

Allowed transitions phải được định nghĩa rõ.

Tối thiểu:

- `DRAFT -> PUBLISHED`
- `PUBLISHED -> HIDDEN`
- `HIDDEN -> PUBLISHED`
- `PUBLISHED -> CLOSED`
- `HIDDEN -> CLOSED`

Không cho:

- `CLOSED -> PUBLISHED` nếu chưa có business rule rõ ràng.
- Publish Job đã quá deadline.
- Bypass Company authorization.

Khi chuyển sang `PUBLISHED`, gán `publishedAt` nếu chưa có.

### 10.6 Employer Company Jobs

Nếu API contract có yêu cầu, triển khai:

```http
GET /api/v1/companies/{companyId}/jobs
```

Chỉ Employer có quyền với Company được xem danh sách gồm cả:

- DRAFT
- PUBLISHED
- HIDDEN
- CLOSED

Hỗ trợ pagination và status filter.

Nếu Gateway routing hiện tại chỉ forward `/api/v1/jobs/**`, cân nhắc dùng:

```http
GET /api/v1/jobs/mine?companyId=...
```

Ưu tiên contract tài liệu và tránh route chồng chéo với User Service.

---

## 11. Internal API cho Application Service

Application Service cần kiểm tra Job trước khi cho Candidate ứng tuyển.

Tạo internal endpoint không public qua Gateway, theo style User Service hiện tại.

Ví dụ:

```http
GET /internal/v1/jobs/{jobId}/application-eligibility
```

Response tối thiểu:

- `jobId`
- `companyId`
- `status`
- `applicationDeadline`
- `acceptingApplications`
- `version` nếu cần

`acceptingApplications = true` khi:

- Job tồn tại.
- Job đang `PUBLISHED`.
- Deadline chưa hết hạn.

Internal endpoint phải:

- Yêu cầu internal service token.
- Không dựa vào public Gateway JWT.
- Không được route qua Gateway.
- Dùng standard error contract.
- Không trả description hoặc dữ liệu dư thừa.
- Có integration test xác nhận thiếu/sai internal token bị từ chối.

Nếu Application Service sau này cần kiểm tra Employer sở hữu Job để cập nhật Application status, cân nhắc thêm internal authorization endpoint:

```http
GET /internal/v1/jobs/{jobId}/employer-authorization?userId={userId}
```

Chỉ triển khai nếu phù hợp với service boundaries và contract hiện tại. Không để Application Service truy cập `job_db`.

---

## 12. Validation và error contract

Tái sử dụng format response/error của Auth Service và User Service.

Các error code tối thiểu cần cân nhắc:

- `VALIDATION_ERROR`
- `JOB_NOT_FOUND`
- `JOB_NOT_PUBLISHED`
- `JOB_APPLICATION_CLOSED`
- `INVALID_JOB_STATUS_TRANSITION`
- `CATEGORY_NOT_FOUND`
- `CATEGORY_INACTIVE`
- `LOCATION_NOT_FOUND`
- `LOCATION_INACTIVE`
- `INVALID_SALARY_RANGE`
- `COMPANY_ACCESS_DENIED`
- `OPTIMISTIC_LOCK_CONFLICT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `UPSTREAM_SERVICE_UNAVAILABLE`
- `UPSTREAM_SERVICE_TIMEOUT`
- `INTERNAL_AUTHENTICATION_FAILED`

Không trả:

- Stack trace.
- SQL.
- Tên table/cột database.
- Internal service token.
- Object implementation details.

Error response phải chứa các field theo contract hiện tại, ví dụ:

- `success`
- `code`
- `message`
- `traceId`
- `timestamp`
- validation details nếu contract hỗ trợ

---

## 13. Search implementation

Trong MVP sử dụng PostgreSQL/JPA.

Có thể dùng:

- `JpaSpecificationExecutor`
- Criteria API
- Specification pattern

Yêu cầu:

- Predicate được tạo từ filter có mặt.
- Tránh ghép JPQL hoặc SQL trực tiếp từ input.
- Keyword được trim và normalize phù hợp.
- Escape wildcard nếu dùng `LIKE`.
- Dùng case-insensitive search.
- Có index hợp lý.
- Không trả toàn bộ dữ liệu khi không pagination.
- Whitelist sort.
- Test nhiều filter kết hợp.

Không dùng Elasticsearch ở Prompt 07.

---

## 14. API response DTO

Không expose JPA entity trực tiếp.

Public Job response không được trả:

- Internal authorization data.
- Trường kỹ thuật không cần thiết.
- Stack/database details.

Response nên gồm:

- `id`
- `companyId`
- `title`
- `description`
- `requirements`
- location summary
- category summary
- `employmentType`
- salary information
- `status` khi phù hợp
- `applicationDeadline`
- `publishedAt`
- `createdAt`

Cân nhắc không trả `createdBy` trên public response nếu không có nhu cầu.

Dùng DTO request/response rõ ràng và mapper nhất quán với project.

---

## 15. Transactions và concurrency

Dùng transaction boundary ở service layer.

Các mutation phải:

- Validate authorization trước khi ghi.
- Không giữ database transaction mở trong lúc gọi HTTP lâu hơn cần thiết nếu có thể thiết kế tránh được.
- Dùng optimistic lock cho Job update.
- Map optimistic locking conflict thành HTTP 409.
- Không thực hiện partial update làm mất dữ liệu ngoài ý muốn.
- Không dùng distributed transaction.

Nếu gọi User Service trước khi lưu Job:

1. Validate input cơ bản.
2. Kiểm tra Company authorization.
3. Mở transaction database phù hợp.
4. Lưu Job.

Ghi chú rõ TOCTOU limitation của authorization qua service boundary nếu cần.

---

## 16. Security

- Không chứa private RSA key.
- Không tự phát hành JWT.
- Không kết nối `auth_db`.
- Không tin userId trong request body.
- Không log Authorization header.
- Không log internal token.
- Không log toàn bộ request body nếu có dữ liệu dài.
- Internal endpoint phải có authentication riêng.
- Swagger/OpenAPI exposure phải theo convention của các service hiện tại.
- Actuator chỉ expose endpoint cần thiết.
- Không public environment/config endpoint.

---

## 17. Test bắt buộc

### 17.1 Unit tests

Viết unit test cho tối thiểu:

- Salary validation.
- Deadline validation.
- Default status.
- Status transitions.
- Employer role validation.
- Company authorization success/failure.
- DTO mapping.
- Search filter construction nếu có logic độc lập.

### 17.2 Repository/Testcontainers tests

Dùng PostgreSQL 17 Testcontainers.

Kiểm tra:

- Flyway chạy thành công trên database mới.
- Hibernate validate thành công.
- Save/load Job.
- Category/Location relations hoặc logical references đúng thiết kế.
- Optimistic locking.
- Search keyword.
- Filter location.
- Filter category.
- Filter salary.
- Filter employment type.
- Chỉ public Job `PUBLISHED`.
- Không trả Job hết deadline.
- Pagination.
- Sort whitelist behavior.

Không sử dụng H2 thay PostgreSQL cho integration test quan trọng.

### 17.3 Controller/integration tests

Kiểm tra ít nhất:

1. Public tìm danh sách Job.
2. Public xem Job `PUBLISHED`.
3. Public không xem Job draft/hidden.
4. Candidate không thể tạo Job.
5. Employer được tạo Job khi Company authorization hợp lệ.
6. Employer không thuộc Company bị 403.
7. Recruiter/OWNER behavior đúng contract User Service.
8. Tạo Job với Category không tồn tại bị từ chối.
9. Tạo Job với Location không tồn tại bị từ chối.
10. Salary range sai bị 400.
11. Deadline quá khứ bị 400.
12. Employer không sửa được Job Company khác.
13. Status transition hợp lệ.
14. Status transition không hợp lệ.
15. Concurrent update trả conflict.
16. Internal eligibility endpoint với token hợp lệ.
17. Internal endpoint thiếu/sai token bị từ chối.
18. Internal endpoint không được Gateway route.
19. User Service unavailable được map đúng error.
20. Correlation ID được giữ trong response lỗi.

Mock HTTP upstream hoặc dùng controlled test server cho User Service client. Không phụ thuộc User Service đang chạy thật trong automated tests.

### 17.4 Gateway regression

Nếu Gateway được sửa:

- Chạy lại toàn bộ Gateway tests.
- Xác minh public Job GET không yêu cầu JWT.
- Xác minh Job mutation yêu cầu JWT Employer.
- Xác minh spoofed identity headers vẫn bị thay thế.
- Xác minh `/internal/**` vẫn trả 404 qua Gateway.
- Không làm hỏng Auth/User routes.

---

## 18. Manual verification

Sau khi automated tests pass, chạy:

- PostgreSQL
- User Service
- Auth Service
- Job Service
- API Gateway

Dùng API Gateway port `8080`.

Luồng kiểm tra tối thiểu:

1. Đăng ký Employer.
2. Login Employer.
3. Tạo Company hoặc dùng Company đã có.
4. Tạo Category/Location bằng fixture phù hợp.
5. Employer tạo Job qua Gateway.
6. Public tìm Job qua Gateway.
7. Public xem chi tiết Job.
8. Employer cập nhật Job.
9. Employer ẩn Job.
10. Xác nhận public không còn thấy Job.
11. Employer publish lại Job nếu transition cho phép.
12. User không thuộc Company cập nhật Job và nhận 403.
13. Gọi internal endpoint qua Gateway và nhận 404.
14. Gọi internal endpoint trực tiếp:
    - token đúng: thành công
    - token sai: bị từ chối
15. Xác minh dữ liệu nằm trong `job_db`.
16. Dừng sạch các process được khởi động cho manual verification.

Không in Access Token, Refresh Token hoặc internal token đầy đủ trong báo cáo.

---

## 19. Lệnh kiểm tra

Trong Job Service:

```powershell
.\mvnw.cmd clean verify
```

Trong API Gateway nếu có sửa:

```powershell
.\mvnw.cmd clean verify
```

Nếu có parent Maven reactor ở root, chỉ chạy reactor khi repository thực sự hỗ trợ.

Báo cáo:

- Java runtime dùng để chạy Maven.
- Java release compile.
- Tổng số test.
- Failures.
- Errors.
- Skipped.
- Testcontainers image.
- Kết quả manual flow.

Không kết luận hoàn thành nếu test đỏ.

---

## 20. Definition of Done

Prompt 07 chỉ hoàn thành khi:

- Job Service chạy ở port 8083.
- Job Service chỉ kết nối `job_db`.
- Flyway migration chạy trên PostgreSQL mới.
- Hibernate `ddl-auto=validate`.
- CRUD Job theo phạm vi được triển khai.
- Search/filter/pagination hoạt động.
- Public chỉ thấy Job hợp lệ đang `PUBLISHED`.
- Employer authorization được kiểm tra qua User Service.
- Employer không quản lý được Job của Company khác.
- Category và Location được validate.
- Salary và deadline rules được enforce.
- Job status transitions được enforce.
- Internal Application eligibility endpoint hoạt động.
- Internal endpoint không public qua Gateway.
- Standard error contract được dùng.
- Correlation ID hoạt động.
- Unit và integration tests pass.
- Gateway regression tests pass nếu Gateway thay đổi.
- Manual flow qua Gateway pass.
- `project-progress.md` được cập nhật.
- Không triển khai Application Service.
- Không có secret thật được commit.

---

## 21. Cập nhật progress

Cập nhật `project-progress.md` với:

### Completed

- Schema/migration.
- Job domain.
- Category/Location.
- Employer authorization.
- CRUD/status transitions.
- Public search/filter/pagination.
- Internal Application eligibility contract.
- Gateway route.
- Tests.

### Verification

- Commands.
- Environment.
- Test counts.
- Manual verification.
- Các service/process đã dừng sau test.

### Remaining limitations

Ví dụ:

- PostgreSQL search chưa thay thế Elasticsearch.
- Company authorization có TOCTOU boundary.
- Internal shared token chỉ phù hợp MVP/private network.
- Admin moderation chưa triển khai nếu ngoài scope.
- Job events/RabbitMQ chưa triển khai nếu ngoài scope.

### Next task

```text
Prompt 08 — Application Service, only when explicitly requested.
```

---

## 22. Báo cáo cuối cùng

Khi hoàn thành, trả lời theo cấu trúc:

1. Tóm tắt kết quả.
2. Danh sách file chính đã tạo/sửa.
3. Database migration.
4. API đã triển khai.
5. Business rules đã triển khai.
6. Security và service-to-service authorization.
7. Automated test result.
8. Manual verification result.
9. Quyết định kiến trúc hoặc mâu thuẫn đã xử lý.
10. Hạn chế còn lại.
11. Git status.
12. Task tiếp theo.

Dừng lại sau Prompt 07. Không bắt đầu Prompt 08.