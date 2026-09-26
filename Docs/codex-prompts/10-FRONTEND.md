# Prompt 10 — Implement Recruitment Platform Frontend

Hãy triển khai hoàn chỉnh **Frontend cho Recruitment Platform** dựa trên API contract và code backend thực tế trong repository.

Không chỉ dựng giao diện tĩnh. Frontend phải tích hợp API Gateway, xác thực JWT, phân quyền Candidate/Employer, quản lý trạng thái, xử lý lỗi, responsive UI, automated tests và manual end-to-end verification.

## 1. Bắt buộc đọc trước khi sửa

Đọc toàn bộ:

1. `Docs/codex-prompts/00-CODEX-USAGE-RULES.md`
2. `Docs/01-system-overview.md`
3. `Docs/02-service-boundaries.md`
4. `Docs/03-business-workflows.md`
5. `Docs/04-database-design.md`
6. `Docs/05-api-contracts.md`
7. `project-progress.md`
8. Code và OpenAPI contract thực tế của:

    * Auth Service
    * User Service
    * Job Service
    * Application Service
    * Notification Service
    * API Gateway
9. Thư mục frontend hiện tại nếu đã tồn tại.

Kiểm tra trạng thái:

```powershell
git status
git branch --show-current
git log -1 --oneline
```

Xác nhận Prompt 09 đã hoàn thành. Nếu backend còn lỗi, contract chưa rõ hoặc automated test chưa pass, dừng và báo trước khi triển khai Frontend.

Không tự commit hoặc push.

## 2. Xác định công nghệ hiện tại

Nếu repository đã quy định frontend stack, phải giữ đúng stack đó.

Nếu chưa có quyết định, sử dụng:

* React.
* TypeScript.
* Vite.
* React Router.
* TanStack Query.
* React Hook Form.
* Zod.
* Axios hoặc Fetch wrapper nhất quán.
* Vitest.
* React Testing Library.
* Playwright cho luồng end-to-end quan trọng.
* CSS Modules, Tailwind CSS hoặc design system đã có trong repository.

Không thêm nhiều thư viện trùng chức năng.

Không sử dụng Next.js nếu kiến trúc hiện tại không yêu cầu SSR.

## 3. Phạm vi được phép thay đổi

Được phép sửa:

* Thư mục Frontend hiện tại.
* Route/cấu hình CORS tối thiểu trong API Gateway nếu thật sự cần.
* `.env.example` với biến frontend không chứa secret.
* Tài liệu liên quan trực tiếp.
* `project-progress.md`.

Không được:

* Triển khai Docker/Observability của Prompt 11.
* Triển khai Kubernetes hoặc CI/CD.
* Refactor lớn backend.
* Thay đổi API contract chỉ để frontend dễ làm hơn.
* Đọc trực tiếp database.
* Gọi trực tiếp từng microservice từ trình duyệt.
* Đưa private key hoặc internal service token vào frontend.
* Public internal endpoints.
* Tự động commit hoặc push.

Frontend chỉ giao tiếp với API Gateway.

## 4. Cấu hình môi trường

Tạo cấu hình tối thiểu:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Yêu cầu:

* Không hard-code URL API trong component.
* Không chứa secret trong biến `VITE_*`.
* Có `.env.example`.
* Validate cấu hình khi khởi động nếu phù hợp.
* Production build không phụ thuộc localhost.
* Development proxy chỉ dùng nếu cần và phải được ghi rõ.

## 5. Kiến trúc frontend

Tổ chức theo feature hoặc domain rõ ràng, ví dụ:

```text
src/
  app/
  routes/
  components/
  layouts/
  features/
    auth/
    candidate/
    company/
    jobs/
    applications/
    notifications/
  api/
  hooks/
  types/
  utils/
  styles/
  test/
```

Yêu cầu:

* Component dùng chung không chứa business logic đặc thù.
* API client tập trung.
* DTO TypeScript phản ánh đúng backend contract.
* Không dùng kiểu `any` để né type checking.
* Không lưu server state trùng lặp tùy tiện.
* Không expose raw backend implementation trong UI.
* Có Error Boundary hoặc cơ chế lỗi cấp ứng dụng phù hợp.
* Có trang `404` và trạng thái lỗi thân thiện.

## 6. Thiết kế giao diện

Thiết kế giao diện hiện đại, chuyên nghiệp cho nền tảng tuyển dụng công nghệ.

Yêu cầu:

* Responsive cho desktop, tablet và mobile.
* Navigation thay đổi theo trạng thái đăng nhập và role.
* Có loading, empty, error và success state.
* Form hiển thị validation rõ ràng.
* Button mutation có disabled/loading state để tránh submit lặp.
* Modal và thông báo phải dễ hiểu.
* Màu sắc có độ tương phản phù hợp.
* Có keyboard navigation cơ bản.
* Input có label.
* Không dùng placeholder thay cho label.
* Không phụ thuộc hoàn toàn vào màu sắc để diễn đạt trạng thái.
* Xác nhận trước hành động xóa hoặc thay đổi trạng thái quan trọng.

Không dùng dữ liệu giả trong production flow khi API tương ứng đã tồn tại.

## 7. Xác thực và phiên đăng nhập

Triển khai đầy đủ:

* Candidate registration.
* Employer registration.
* Login.
* Logout.
* Refresh Access Token.
* Khôi phục phiên hợp lý khi tải lại trang.
* Protected route.
* Role-based route.
* Redirect sau đăng nhập.
* Xử lý phiên hết hạn.

Yêu cầu bảo mật:

* Không decode JWT rồi coi dữ liệu đó là authorization cuối cùng.
* Backend vẫn là nguồn quyết định quyền.
* Không lưu password.
* Không log Access Token hoặc Refresh Token.
* Không đưa token vào query string.
* Không gửi `X-User-Id`, `X-User-Email`, `X-User-Role` từ frontend.
* Gateway phải tự tạo trusted identity headers.
* Tránh nhiều refresh request đồng thời bằng single-flight refresh.
* Nếu refresh thất bại, xóa session và chuyển đến login.
* Không lặp vô hạn giữa request và refresh.
* Logout phải gọi API backend khi contract yêu cầu.
* Không hiển thị lỗi login làm lộ tài khoản có tồn tại hay không.

Tuân theo cơ chế token hiện tại của backend. Không tự chuyển sang cookie nếu backend chưa hỗ trợ.

## 8. Trang public

Triển khai tối thiểu:

### Trang chủ

* Hero/search.
* Danh sách Job mới.
* Category hoặc Location nổi bật nếu API cung cấp.
* Liên kết đến danh sách việc làm.
* CTA đăng nhập/đăng ký phù hợp.

### Danh sách việc làm

Route đề xuất:

```text
/jobs
```

Hỗ trợ:

* Keyword.
* Location.
* Category.
* Employment type.
* Salary minimum.
* Sort whitelist.
* Pagination.
* Đồng bộ filter quan trọng vào URL query parameters.
* Loading skeleton.
* Empty state.
* Error state.
* Không gửi query không hợp lệ.
* Không tải toàn bộ Job rồi lọc ở client.

### Chi tiết việc làm

Route:

```text
/jobs/:jobId
```

Hiển thị:

* Tiêu đề.
* Company ID hoặc Company summary nếu API trả về.
* Location.
* Category.
* Employment type.
* Salary.
* Description.
* Requirements.
* Deadline.
* Trạng thái nhận hồ sơ.
* Nút ứng tuyển phù hợp.

Public không được thấy Job DRAFT, HIDDEN, CLOSED hoặc hết hạn nếu backend contract không cho phép.

## 9. Candidate portal

Candidate phải có các màn hình:

### Candidate Profile

* Xem hồ sơ.
* Tạo hồ sơ nếu chưa có.
* Cập nhật hồ sơ.
* Validation theo backend.
* Không cho sửa profile của user khác.

### CV Management

* Upload CV PDF.
* Hiển thị giới hạn dung lượng.
* Validate extension/MIME phía client để hỗ trợ UX, nhưng không thay thế backend validation.
* Danh sách CV.
* Xóa CV có xác nhận.
* Không hiển thị MinIO object key.
* Không cho truy cập CV của Candidate khác.

### Apply Job

* Chọn CV thuộc Candidate.
* Gửi application.
* Chặn double submit.
* Xử lý duplicate application.
* Hiển thị Job đã đóng/hết hạn.
* Không cho Candidate gửi `candidateId` tùy ý nếu backend lấy identity từ Gateway.

### My Applications

* Danh sách application có pagination/filter nếu contract hỗ trợ.
* Hiển thị Job, Company, ngày ứng tuyển và trạng thái.
* Xem chi tiết application.
* Timeline trạng thái nếu API cung cấp.
* Hiển thị trạng thái bằng label dễ hiểu.

## 10. Employer portal

Employer phải có các màn hình:

### Company Management

* Tạo Company.
* Xem Company mà Employer có quyền.
* Cập nhật Company khi là OWNER.
* Thêm RECRUITER nếu contract hỗ trợ.
* Hiển thị lỗi 403 rõ ràng khi không đủ quyền.
* Không hiển thị chức năng OWNER cho RECRUITER nếu backend không cho phép.

### Job Management

* Danh sách Job theo Company.
* Filter trạng thái.
* Tạo Job.
* Cập nhật Job.
* Publish.
* Hide.
* Close.
* Hiển thị version conflict.
* Không cho phép transition trạng thái sai.
* Salary negotiable được xử lý đúng contract.
* Deadline phải nằm trong tương lai.
* Company, Category và Location phải dùng dữ liệu hợp lệ từ API.

### Application Management

* Danh sách application theo Job hoặc Company theo API contract.
* Xem chi tiết Candidate/Application.
* Cập nhật trạng thái theo allowed transitions.
* Không cho Employer quản lý application của Company khác.
* Hiển thị optimistic-lock conflict nếu backend hỗ trợ.
* Xác nhận trước thao tác reject hoặc trạng thái quan trọng.

Frontend chỉ ẩn/hiện chức năng để cải thiện UX; backend vẫn phải kiểm tra authorization.

## 11. Notification UI

Nếu Prompt 09 đã triển khai public Notification API, tạo:

* Notification dropdown hoặc trang danh sách.
* Unread count.
* Pagination.
* Mark as read.
* Link đến Application liên quan khi contract cung cấp.
* Empty/loading/error states.
* Không dùng polling quá dày.

Nếu Prompt 09 chỉ triển khai email consumer và không có public Notification API:

* Không tự tạo API backend.
* Không tạo dữ liệu notification giả.
* Chỉ ghi rõ Notification UI chưa có vì nằm ngoài contract hiện tại.

## 12. API client và error handling

Tạo API client dùng chung:

* Base URL từ environment.
* JSON handling.
* Multipart upload cho CV.
* Authorization header.
* Correlation ID nếu frontend contract yêu cầu.
* Refresh-token handling.
* Request cancellation khi component unmount hoặc search thay đổi.
* Timeout hợp lý.
* Chuẩn hóa backend success/error envelope.

Map lỗi tối thiểu:

* `VALIDATION_ERROR`
* `INVALID_CREDENTIALS`
* `UNAUTHORIZED`
* `FORBIDDEN`
* `PROFILE_NOT_FOUND`
* `CV_NOT_FOUND`
* `JOB_NOT_FOUND`
* `JOB_APPLICATION_CLOSED`
* `DUPLICATE_APPLICATION`
* `INVALID_APPLICATION_STATUS_TRANSITION`
* `OPTIMISTIC_LOCK_CONFLICT`
* `UPSTREAM_SERVICE_UNAVAILABLE`
* `UPSTREAM_SERVICE_TIMEOUT`

Yêu cầu:

* Không hiển thị stack trace.
* Không hiển thị SQL hoặc thông tin nội bộ.
* Có fallback message khi gặp error code chưa biết.
* Log development phải được kiểm soát.
* Production không log token hoặc payload nhạy cảm.

## 13. Form và validation

Dùng schema validation nhất quán.

Các form tối thiểu:

* Register.
* Login.
* Candidate Profile.
* Company.
* Company Member.
* Job create/update.
* Job status.
* CV upload.
* Application submission.
* Application status update.

Client validation phải tương thích backend:

* Email.
* Password policy.
* Required fields.
* Độ dài title/description/requirements.
* Salary không âm.
* `salaryMax >= salaryMin`.
* Deadline tương lai.
* PDF và kích thước file.
* UUID/path parameter không hợp lệ.
* Không trim password.
* Trim và normalize các text field phù hợp.

Backend vẫn là nguồn validation cuối cùng.

## 14. Routing và authorization

Tối thiểu có:

```text
/
/login
/register
/jobs
/jobs/:jobId
/candidate/profile
/candidate/cvs
/candidate/applications
/employer/companies
/employer/companies/:companyId
/employer/companies/:companyId/jobs
/employer/jobs/new
/employer/jobs/:jobId/edit
/employer/jobs/:jobId/applications
/notifications
/403
/404
```

Điều chỉnh theo API và UI thực tế.

Yêu cầu:

* Public route không cần login.
* Candidate route chỉ cho Candidate.
* Employer route chỉ cho Employer.
* User đã login không nên quay lại login/register nếu không cần.
* Sau login chỉ redirect về internal path an toàn.
* Không chấp nhận open redirect từ query parameter.

## 15. State management và caching

Dùng TanStack Query cho server state:

* Query keys có cấu trúc.
* Invalidate đúng query sau mutation.
* Không refetch không cần thiết.
* Không cache vô hạn dữ liệu nhạy cảm.
* Pagination giữ trải nghiệm ổn định.
* Search input có debounce hợp lý.
* Mutation có error handling.
* Chỉ dùng optimistic update khi rollback an toàn.

Không thêm Redux nếu chưa có nhu cầu rõ ràng.

## 16. Test bắt buộc

### Unit/component tests

Kiểm tra tối thiểu:

1. Login validation.
2. Register theo role.
3. Protected route.
4. Candidate/Employer role guard.
5. API error mapping.
6. Token refresh single-flight.
7. Logout khi refresh thất bại.
8. Job filter và query parameters.
9. Salary/deadline validation.
10. CV file validation.
11. Duplicate submit prevention.
12. Status transition controls.
13. Loading/empty/error states.
14. 403 và 404 pages.

### Integration tests với mocked API

Kiểm tra:

1. Public xem danh sách Job.
2. Public xem Job detail.
3. Candidate cập nhật profile.
4. Candidate upload/delete CV.
5. Candidate ứng tuyển.
6. Candidate xem application.
7. Employer tạo/cập nhật Job.
8. Employer thay đổi Job status.
9. Employer xem và cập nhật application.
10. 401 kích hoạt refresh.
11. Refresh thất bại chuyển về login.
12. Backend validation details hiển thị đúng.

Dùng MSW hoặc công cụ mock HTTP phù hợp. Không mock trực tiếp implementation hook nếu có thể kiểm tra qua network boundary.

### Playwright E2E

Kiểm tra tối thiểu qua API Gateway thật:

1. Candidate register/login.
2. Candidate profile và CV.
3. Public Job search/detail.
4. Candidate apply Job.
5. Employer login.
6. Employer xem Application.
7. Employer đổi trạng thái Application.
8. Candidate thấy trạng thái mới.
9. Logout.
10. Unauthorized role navigation bị chặn.

Không hard-code token hoặc user ID.

Test data phải deterministic và có cleanup phù hợp.

## 17. Build và chất lượng

Phải chạy:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Nếu package manager hiện tại là pnpm hoặc yarn, dùng đúng lockfile hiện có, không tạo lockfile thứ hai.

Yêu cầu:

* Không có TypeScript error.
* Không có lint error.
* Unit/integration tests pass.
* Production build thành công.
* Không commit `node_modules`.
* Không có secret trong bundle.
* Không có console error nghiêm trọng trong manual flow.
* Không có request gọi trực tiếp port của microservice.

Nếu có Playwright:

```powershell
npm run test:e2e
```

## 18. Manual verification

Chạy backend cần thiết cùng API Gateway và Frontend.

Kiểm tra:

### Public

1. Trang chủ hoạt động.
2. Search/filter/pagination Job.
3. Xem Job detail.
4. Responsive trên desktop và mobile.

### Candidate

1. Register/login.
2. Tạo/cập nhật profile.
3. Upload/list/delete CV.
4. Apply Job.
5. Không apply trùng.
6. Xem My Applications.
7. Nhận/đọc notification nếu API hỗ trợ.
8. Logout.

### Employer

1. Register/login.
2. Tạo/xem/cập nhật Company.
3. Tạo Job.
4. Publish/hide/republish/close theo transition.
5. Xem Application.
6. Cập nhật Application status.
7. Không quản lý được Company/Job/Application của Employer khác.
8. Logout.

### Security

1. Candidate không vào Employer route.
2. Employer không vào Candidate mutation route.
3. Client không gửi trusted identity headers.
4. Internal endpoint không truy cập được qua Gateway.
5. Token hết hạn được refresh đúng.
6. Refresh lỗi kết thúc session.
7. Không có token trong URL hoặc console.
8. Reload trang không làm hỏng trạng thái phiên theo thiết kế hiện tại.

Dừng sạch các process chỉ được khởi động cho verification.

## 19. Definition of Done

Prompt 10 chỉ hoàn thành khi:

* Frontend tích hợp duy nhất qua API Gateway.
* Auth/register/login/refresh/logout hoạt động.
* Role-based routing hoạt động.
* Public Job search/detail hoạt động.
* Candidate Profile và CV hoạt động.
* Candidate apply và xem Application hoạt động.
* Employer Company/Job/Application flow hoạt động.
* Error/loading/empty states đầy đủ.
* Responsive UI hoạt động.
* Client và backend validation tương thích.
* Unit/integration tests pass.
* Production build pass.
* Playwright critical flow pass nếu môi trường cho phép.
* Manual end-to-end flow pass.
* Không có secret trong source hoặc bundle.
* `project-progress.md` được cập nhật.
* Không triển khai Prompt 11.
* Không tự commit hoặc push.

## 20. Cập nhật tiến độ

Cập nhật `project-progress.md` với:

### Completed

* Frontend stack và kiến trúc.
* Authentication/session handling.
* Public pages.
* Candidate portal.
* Employer portal.
* Notification UI nếu có.
* Responsive/accessibility.
* Automated tests.

### Verification

* Node/npm version.
* Lint result.
* Type-check result.
* Test counts.
* Production build.
* Playwright result.
* Manual end-to-end verification.

### Remaining limitations

Ghi đúng thực tế, ví dụ:

* Chưa có social login UI.
* Notification chỉ email nếu backend chưa có Notification API.
* Chưa có SSR/SEO nâng cao.
* Chưa có production analytics.
* Accessibility mới ở mức cơ bản.
* Container hóa và observability thuộc Prompt 11.

### Next task

```text
Prompt 11 — Docker and Observability, only when explicitly requested.
```

## 21. Báo cáo cuối

Báo cáo theo cấu trúc:

1. Tóm tắt kết quả.
2. Frontend stack.
3. File chính đã tạo/sửa.
4. Routing và phân quyền.
5. API integration.
6. Candidate flow.
7. Employer flow.
8. Security/session handling.
9. Automated test result.
10. Production build result.
11. Manual verification.
12. Quyết định kiến trúc hoặc contract conflict.
13. Hạn chế còn lại.
14. Git status.
15. Task tiếp theo.

Dừng sau Prompt 10. Không triển khai Prompt 11.
