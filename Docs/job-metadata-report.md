# Job Category và Job Location — 2026-10-02

## 1. Migration và dữ liệu

Tạo `Services/job-service/src/main/resources/db/migration/V2__seed_job_categories_and_locations.sql`. UUID và timestamps cố định, `ON CONFLICT (slug) DO NOTHING`, không thay đổi schema. Không sửa V1 trong nhiệm vụ này; V1 đã có thay đổi chưa commit từ baseline.

Seed 15 Category: Backend Development; Frontend Development; Fullstack Development; Mobile Development; DevOps / Cloud; System / Network; Cybersecurity; Data Engineering; Data Science / Machine Learning; QA / Software Testing; Business Analysis; UI / UX Design; IT Support / Helpdesk; Database Administration; Project / Product Management.

Seed 10 Location: Hồ Chí Minh; Hà Nội; Đà Nẵng; Bình Dương; Đồng Nai; Cần Thơ; Hải Phòng; Huế; Nha Trang; Remote / Toàn quốc. Tên và slug đúng danh sách yêu cầu. SQL trực tiếp trên Compose `job_db` xác nhận 15/10 bản ghi, số slug distinct tương ứng 15/10, tất cả active; Flyway history V1 và V2 đều success.

## 2. API và Gateway

- `GET /api/v1/jobs/metadata/categories`
- `GET /api/v1/jobs/metadata/locations`

Hai endpoint public read-only trả success envelope hiện có, `data` là mảng `{id,name,slug}`. Repository lọc `active=true`, `ORDER BY name ASC`; service transaction read-only, không gọi User Service/internal API, không expose entity hay timestamps.

Gateway dùng route `/api/v1/jobs/**` và GET permit hiện có, không sửa route/security configuration. Static metadata mapping không xung đột detail UUID. Test kiểm tra anonymous metadata/detail routing, POST metadata không public, anonymous internal 401 và authenticated internal 404.

Create/update giữ nguyên lỗi 404 `CATEGORY_NOT_FOUND`/`LOCATION_NOT_FOUND`, 409 `CATEGORY_INACTIVE`/`LOCATION_INACTIVE`.

## 3. Frontend

`src/api/jobMetadata.ts` cung cấp types `JobCategoryOption`, `JobLocationOption`, methods `getJobCategories()`, `getJobLocations()` và hook `useJobMetadata()`. Dùng Axios client hiện có với `VITE_API_BASE_URL`; không gọi trực tiếp port Job Service. TanStack Query chia sẻ request/cache: stale time 30 phút, garbage collection 60 phút, retry thủ công. Response sai cấu trúc được chuyển thành trạng thái lỗi có thể thử lại.

SearchBar và FilterSidebar dùng chung ReferenceSelect, có option tất cả, loading skeleton, empty/error/retry. UUID là value; tên là label/chip. Bộ lọc và xóa filter cập nhật URL/query, reload khôi phục lựa chọn. UUID đã mất có fallback an toàn, không crash/hiển thị UUID; gửi lại search sẽ bỏ UUID không hợp lệ đã xác minh. Search từ khóa vẫn hoạt động khi metadata lỗi. Mobile drawer dùng cùng hook/cache.

Employer JobForm bỏ nhập UUID, bắt buộc chọn Category/Location thuộc danh mục hiện có, chặn submit khi metadata chưa hợp lệ. Edit chọn đúng giá trị, giữ dữ liệu khi validation lỗi; lựa chọn cũ không còn active hiển thị yêu cầu chọn lại. Cập nhật hướng dẫn JobEditor và cả dropdown trong PublicPages cũ.

JobCard/JobDetail vốn đã dùng summary name nên giữ nguyên cách hiển thị, bổ sung kiểm thử. JobService thay lookup theo từng Job bằng hai bulk lookup cho mỗi trang. Test với 6 Job có danh mục khác nhau xác nhận trang 5 Job chỉ dùng 4 SQL statements: jobs, count, categories, locations; áp dụng cả public và employer list. Không có metadata HTTP request theo từng card.

## 4. Verification

| Kiểm tra | Kết quả |
|---|---|
| Baseline `git status --short` | Workspace có nhiều thay đổi từ trước, giữ nguyên ngoài phạm vi |
| Baseline Job `mvnw.cmd clean verify` | 12 tests pass |
| Baseline frontend lint/typecheck/test/build | Pass; 69 tests |
| Job `mvnw.cmd clean verify` sau thay đổi | 16 tests pass, 0 failures/errors/skips |
| Gateway `mvnw.cmd clean verify` | 14 tests pass, 0 failures/errors/skips |
| Frontend lint/typecheck/test/build | Pass; 85 tests trong 10 files |
| PostgreSQL Testcontainers | Fresh V1+V2, deterministic seed, chạy lại seed không thay dữ liệu, active/sort/validation/N+1 pass |
| Live metadata browser E2E | Desktop Chromium và Pixel 7 emulation: 2 pass |
| Browser regression | 21 scenarios pass sau các lần chạy/sửa test; 7 skip theo project |

Windows: dùng `npm.cmd` vì PowerShell chặn `npm.ps1`; đặt `JAVA_HOME` trong process tới JDK 26.0.1, Maven compile release 21. Không đổi cấu hình hệ thống.

Browser suite đầu tiên: 19 pass, 2 fail, 7 skip. Cập nhật mock Employer để trả metadata; chỉnh selector chính xác/chờ response upload trong test live cũ (không đổi chức năng CV). Chạy lại nhóm bị ảnh hưởng: 5 UX scenarios pass và live Candidate/Employer scenario pass. Hai metadata scenarios desktop/mobile cũng pass trong suite đầy đủ. Không tuyên bố một lần full-suite cuối có 21 pass; đây là kết quả tổng hợp sau các lần chạy lại liên quan.

Logs baseline, Maven, frontend, browser, Compose và SQL được giữ local tại `Services/job-service/target/metadata-verification/` (Git ignored). `git diff --check` pass.

Đã chạy `docker compose up -d --build job-service api-gateway frontend` và kiểm tra logs. HTTP trực tiếp qua Gateway `localhost:8080` trả success với 15 Category/10 Location. Trình duyệt chạy production frontend `localhost:3000` qua Nginx → Gateway; test live không mock API metadata hay Job.

## 5. Kiểm chứng flow trong môi trường thật

Các bước được xác minh bằng SQL/HTTP và Playwright trên trình duyệt thật, không phải kiểm tra bằng tay độc lập:

1. Hai endpoint metadata trả dữ liệu không cần JWT qua Gateway.
2. Trang chủ hiển thị các lựa chọn từ metadata.
3. Employer đăng nhập, tạo Company test, tạo Job qua dropdown; body gửi đúng UUID.
4. Edit Job khôi phục cả hai lựa chọn và lưu thành công.
5. Publish Job, lọc riêng Category, riêng Location, kết hợp cả hai.
6. Reload giữ URL và lựa chọn; chip hiển thị tên, xóa chip bỏ filter.
7. Job Card/Detail hiển thị tên, không hiện UUID của danh mục.
8. Mobile drawer chọn filter và đóng đúng.
9. Một request/category và một request/location được dùng chung giữa search/sidebar trong phiên tải trang.
10. Không có page error/console error trong live metadata flow ở desktop/mobile.

## 6. File tạo/sửa trong nhiệm vụ

Các file khác trong Git status là thay đổi có sẵn trước nhiệm vụ.

Job Service:

- `Services/job-service/src/main/resources/db/migration/V2__seed_job_categories_and_locations.sql` (mới)
- `Services/job-service/src/main/java/com/example/job_service/controller/JobMetadataController.java` (mới)
- `Services/job-service/src/main/java/com/example/job_service/dto/JobCategoryResponse.java` (mới)
- `Services/job-service/src/main/java/com/example/job_service/dto/JobLocationResponse.java` (mới)
- `Services/job-service/src/main/java/com/example/job_service/service/JobMetadataService.java` (mới)
- `Services/job-service/src/main/java/com/example/job_service/repository/CategoryRepository.java`
- `Services/job-service/src/main/java/com/example/job_service/repository/LocationRepository.java`
- `Services/job-service/src/main/java/com/example/job_service/service/JobService.java`
- `Services/job-service/src/test/java/com/example/job_service/JobMetadataMigrationTest.java` (mới)
- `Services/job-service/src/test/java/com/example/job_service/JobServiceApplicationTests.java`
- `Services/api-gateway/src/test/java/com/example/api_gateway/ApiGatewayApplicationTests.java`

Frontend:

- `Frontend/src/api/jobMetadata.ts` (mới)
- `Frontend/src/features/jobs/ReferenceSelect.tsx`
- `Frontend/src/features/jobs/SearchBar.tsx`
- `Frontend/src/features/jobs/FilterSidebar.tsx`
- `Frontend/src/features/jobs/JobBoardPages.tsx`
- `Frontend/src/features/jobs/PublicPages.tsx`
- `Frontend/src/features/jobs/schemas.ts`
- `Frontend/src/features/employer/JobForm.tsx`
- `Frontend/src/features/employer/EmployerPages.tsx`
- `Frontend/src/styles/ux.css`
- `Frontend/src/test/server.ts`
- `Frontend/src/test/job-metadata.test.tsx` (mới)
- `Frontend/e2e/job-metadata-live.spec.ts` (mới)
- `Frontend/e2e/frontend.spec.ts`
- `Frontend/e2e/responsive.spec.ts`
- `Frontend/e2e/ux-responsive.spec.ts`
- `Frontend/e2e/live-gateway.spec.ts`

Tài liệu:

- `Docs/05-api-contracts.md`
- `Docs/progress/project-progress.md`
- `Docs/job-metadata-report.md` (mới)
- `Docs/progress/job-metadata-git-status.txt` (mới, snapshot `git status --short`)

## 7. Giới hạn và trạng thái

- Build giữ cảnh báo bundle >500 kB đã có từ baseline; không chặn build.
- Sắp xếp theo collation PostgreSQL; không áp dụng bộ so sánh tiếng Việt riêng.
- Metadata cache có thể cũ tối đa stale time giữa các lần revalidation; backend luôn kiểm tra active khi create/update.
- Browser verification dùng Chromium và mobile emulation; chưa kiểm tra thiết bị vật lý/Safari/Firefox.
- Dữ liệu Employer/Company/Job thử nghiệm được giữ trong database local. Không xóa volume/dữ liệu có sẵn.
- Không triển khai tính năng ngoài Location/Category, không commit hoặc push. Không sửa `infrastructure/observability/grafana/provisioning/datasources/prometheus.yml`.
