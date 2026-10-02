# Báo cáo tối ưu UI/UX Recruitment Platform

Ngày thực hiện: 2026-10-01. Phạm vi: Frontend và tài liệu. Không thay đổi backend/API contract, dependency, hạ tầng, Docker, Kubernetes hoặc CI/CD. Không commit/push.

## 1. Audit trước khi sửa

Audit được lập trước khi sửa implementation tại [ux-audit.md](ux-audit.md). Trạng thái Git ban đầu sạch. Baseline: lint/typecheck/build pass, 39 test trong 8 file pass. Dùng `npm.cmd` do execution policy chặn `npm.ps1`.

| Luồng | Vấn đề tìm thấy trong code | Ảnh hưởng | Đã cải thiện |
|---|---|---|---|
| Tìm việc | Nhập mã địa điểm/ngành nghề; sort trong filter; back link cố định `/jobs` | Khó tìm, mất ngữ cảnh | Gợi ý từ Job thật; mã trong phần nâng cao; sort riêng; back giữ query/page và scroll khi có state |
| Chi tiết Job | Mã công ty hiển thị như tên; chưa kiểm tra CV | Thiếu thông tin, đến bước sau mới biết thiếu CV | Company GET public; CTA chờ kiểm tra CV/Application, retry khi kiểm tra lỗi |
| Ứng tuyển | CV không chọn sẵn; chỉ kiểm tra 20 application đầu; redirect thiếu phản hồi | Thừa thao tác, duplicate ngoài trang đầu, không rõ thành công | CV mặc định/đầu tiên được chọn; tìm qua phân trang; success state tại trang chi tiết Application |
| Quản lý CV | Thiếu upload/delete success, delete error và return path | Đứt luồng, không biết kết quả | Kiểm tra tên/dung lượng, giữ file khi lỗi, retry, dialog xóa, quay lại Job |
| Xem Application | Mã công ty thô; empty thiếu CTA | Khó nhận diện và tiếp tục | Tên công ty, nhãn trạng thái tiếng Việt, CTA tìm việc, retry |
| Tạo Company | Registry dùng chung tài khoản; hiện mọi action OWNER | Nhầm công ty/quyền | Registry riêng theo tài khoản, chỉ hiện member form cho OWNER biết được từ lần tạo thành công |
| Đăng Job | Reset initial mỗi render; tìm Job chỉ trang đầu; deadline cho phép hôm nay | Mất dữ liệu khi lỗi, không sửa được tin cũ | Giữ form, lookup có phân trang, chia section, ngày từ ngày mai, reload conflict có xác nhận |
| Quản lý ứng viên | Enum tiếng Anh; native prompt rồi confirm; không feedback | Khó hiểu hành động, nhiều hộp thoại | Một dialog gồm ghi chú/xác nhận, allowed transitions, success và invalidate list/detail |

Không có file prompt nâng cấp Job Board riêng trong repository. Đã đối chiếu Prompt 10, JobBoard hiện tại, router/guard, DTO/client, tài liệu API/progress và controller/DTO/rules của các service thực tế.

## 2. Candidate journey trước và sau

**Trước:** đăng nhập mặc định vào danh sách ứng tuyển; checklist luôn vẽ dấu hoàn tất; chi tiết chưa kiểm tra CV; upload không có đường về Job; back về danh sách mất filter.

**Sau:** đăng nhập mặc định về tổng quan; checklist dựa trên profile, CV và Application thật; thiếu profile có CTA tạo hồ sơ; thiếu CV có CTA upload ngay tại Job; upload thành công có link quay lại; gửi thành công có trạng thái và link theo dõi.

| Đoạn hành trình | Trước | Sau — thao tác đã kiểm chứng |
|---|---|---|
| Trang chủ → chi tiết | Chưa đo trên trình duyệt trước sửa | Nhập từ khóa, nhấn tìm, chọn tên Job; 2 lần nhấn sau nhập liệu |
| Sau khi nhấn “Ứng tuyển ngay” → thành công | Chưa đo; code yêu cầu tự chọn CV | CV được chọn sẵn: nhấn kiểm tra, nhấn gửi = 2 thao tác; đổi CV thêm 1 thao tác |
| Chưa có CV → upload → Job | Không có link quay lại trong code | Nhấn tải CV, chọn file, tải lên, quay lại Job; 4 thao tác, không tính tương tác hộp chọn file của hệ điều hành |
| Tổng quan → việc đã ứng tuyển | Chưa đo | 1 link trực tiếp trên navigation hoặc checklist (mobile thêm mở drawer) |

Các số sau sửa là thao tác trên giao diện trong Playwright với API mock, không phải số liệu analytics/nghiên cứu người dùng. Không tuyên bố đã đo giảm số bước so với baseline.

## 3. Employer journey trước và sau

**Trước:** công ty/tin/hồ sơ gộp navigation; form tạo Company không chỉ bước tiếp; trạng thái dùng enum và hai native dialog; form tin có nguy cơ reset sau API lỗi.

**Sau:** tổng quan hướng dẫn tạo/kết nối Company, có link đăng tin sau tạo; các mục tin và hồ sơ riêng; danh sách theo Company kiểm tra quyền ở backend; mỗi Application có một dialog ghi chú/xác nhận và feedback.

| Đoạn hành trình | Trước | Sau — kiểm chứng trên browser mock |
|---|---|---|
| Tổng quan mới → tạo Company | Chưa đo | Nhấn tạo hồ sơ công ty, nhập tên, nhấn tạo (2 lần nhấn ngoài nhập liệu) |
| Company mới → lưu Job | Chưa đo | Link đăng tin đầu tiên, điền form, lưu bản nháp (2 lần nhấn ngoài nhập liệu/chọn trường) |
| Bản nháp → đăng tuyển | Chưa đo | Nhấn đăng tuyển và xác nhận (2 lần) |
| Job → danh sách Application | Chưa đo | 1 link hồ sơ ứng tuyển tại Job |
| Application → đổi trạng thái | Code dùng prompt và confirm | Chọn trạng thái, ghi chú tùy chọn, xác nhận (2 lần nhấn ngoài nhập ghi chú) |

Contract tạo DRAFT rồi publish riêng được giữ nguyên. Không gộp hai mutation để giả định đăng tuyển nguyên tử.

## 4. Navigation và information architecture

- Public: trang chủ, việc làm, nhà tuyển dụng, đăng nhập, đăng ký. CTA nhà tuyển dụng chọn sẵn role đăng ký.
- Candidate: tổng quan, tìm việc, hồ sơ cá nhân, CV của tôi, việc đã ứng tuyển, email và đăng xuất.
- Employer: tổng quan, công ty, tin tuyển dụng, hồ sơ ứng tuyển, email và đăng xuất.
- Active state và `aria-current` theo khu vực chức năng; icon cùng hệ Lucide.
- Drawer trên mobile có Escape, focus trap/return, khóa cuộn và inert nội dung ngoài drawer.
- Chi tiết Application của Employer dùng route `/employer/applications/:id`; route Candidate có guard Candidate.
- Safe return giữ query/hash, chặn external/protocol-relative/backslash/control-character/login loop. Đăng ký giữ return path qua bước login.
- Cache query được xóa khi đổi danh tính tài khoản; danh sách công ty cục bộ không còn dùng chung giữa tài khoản.

## 5. CTA và microcopy

| Trang | CTA chính |
|---|---|
| Trang chủ | Tìm việc ngay |
| Danh sách Job | Tìm việc; xem chi tiết trên mỗi card |
| Chi tiết Job | Đăng nhập / tải CV / ứng tuyển / trạng thái đã gửi tùy dữ liệu |
| Apply | Kiểm tra và gửi hồ sơ → Gửi hồ sơ |
| Tổng quan Candidate | Tạo/hoàn thiện hồ sơ → Tải CV → Tìm việc |
| Hồ sơ Candidate | Lưu hồ sơ, sau thành công tiếp tục tải CV |
| CV | Tải lên hoặc thử tải lại |
| Company | Tạo công ty; sau thành công đăng tin đầu tiên |
| Job editor | Lưu bản nháp hoặc Cập nhật; xem lại là phụ |
| Hồ sơ tuyển dụng | Action hợp lệ theo trạng thái: xem xét, phỏng vấn, đề nghị, đã tuyển, từ chối |

Đã bỏ thuật ngữ Gateway/portal/API contract khỏi nội dung luồng chính. Lỗi API chưa biết dùng fallback tiếng Việt, không in message nội bộ tùy ý. Không dùng enum tiếng Anh làm nhãn nút/trạng thái đọc bởi screen reader.

## 6. Loading, empty, error và feedback

- Skeleton chung; danh sách Job giữ kết quả cũ khi đổi filter, thông báo đang cập nhật.
- Empty theo từng luồng có CTA: tải CV, tìm việc, tạo Company, đăng tin, bỏ filter.
- Retry ở danh sách, profile, CV, detail, Application và kiểm tra điều kiện ứng tuyển.
- Upload lỗi giữ file; lỗi form giữ nội dung; lỗi trong dialog được thông báo ngay trong dialog.
- Apply có success state, invalidate/check trạng thái đã gửi và chống submit lặp.
- CV deletion, đóng/ẩn tin và thay đổi trạng thái Application dùng confirmation có pending/disabled.
- Conflict tin có tải bản mới nhất kèm xác nhận bỏ nội dung chưa lưu. Action status có reload dữ liệu khi lỗi.
- Trang không đủ quyền/không tìm thấy có đường tiếp tục; không gọi API vô hạn với ID không hợp lệ.

## 7. Responsive và accessibility

Playwright kiểm tra 375/768/1024/1440px: public pages, role navigation, mobile filter, Candidate upload/apply/success và các trang Employer. Kiểm tra horizontal overflow trên các trang đã nêu; screenshot form Job được tạo ở cả bốn kích thước.

Đã kiểm tra trực quan screenshot form trên mobile; form chia section, action bar dễ chạm, các trường nâng cao được thu gọn. Dialog giới hạn chiều cao viewport và cuộn nội dung. Touch target chính tối thiểu 44px; focus-visible, labels/aria-describedby/aria-invalid, live feedback và reduced-motion được giữ/bổ sung.

Chưa thực hiện audit WCAG đầy đủ, screen reader thực tế hoặc thử nghiệm thiết bị vật lý. Không coi kiểm tra viewport tự động là chứng nhận accessibility.

## 8. Component/file đã sửa

- `app/AppLayout`, `app/Guards`, `routes/Router`, auth context/pages: navigation, role, safe return, cache.
- `components/DesignSystem`, `Ui`, `useFocusScope`: dialog/drawer focus, loading, labels, status.
- JobBoardPages/Home, JobCard, SearchBar, FilterSidebar, ReferenceSelect, MarketingSections: search/detail/apply context và CTA.
- CandidatePages, JobApplyPage, CvManager, DashboardPages: onboarding, CV, Application và feedback.
- EmployerPages, EmployerWorkspace, JobForm, RecruitmentLists: Company, Job và Application flows.
- CompanySummary/registry, api/errors/lookups, utils/navigation, job schemas: tên công ty, error mapping, phân trang và validation.
- `styles/ux.css`, `main.tsx`: responsive và accessibility trên design system hiện có.
- Unit/MSW và Playwright: thêm UX flows, cập nhật selectors/fixtures theo UI mới.

Danh sách file chính xác và trạng thái Git cuối nằm ở mục 12.

## 9. Test và build

Môi trường: Node 24.13.0, npm 11.6.2. Các lệnh chạy trong `Frontend/` bằng `npm.cmd`.

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run lint` | Pass, 0 warning ESLint |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run test` | 69 test / 9 file pass, không skip |
| `npm.cmd run test:e2e -- --workers=2` | 18 pass; 8 skip theo điều kiện project/môi trường |
| `npm.cmd run build` | Pass; còn advisory bundle-size và annotation Zod |
| `git diff --check` | Pass |

8 Playwright skip gồm 2 live-test project entries do Gateway chưa sẵn sàng, 5 bản lặp mobile của test đã chạy với các kích thước cụ thể trên Chromium, và 1 test mobile-menu dành riêng mobile bị skip trên desktop. Không phải 8 luồng chưa triển khai. Lượt chạy ổn định dùng 2 worker sau một lượt timeout khi đang chỉnh sửa; không bật retry để che lỗi.

Test cases bao phủ 18 nhóm yêu cầu: navigation theo role, safe return, hai onboarding, giữ filter, mobile drawer, các CTA ứng tuyển, thiếu CV, success, chống submit lặp, empty CTA, retry, validation, allowed actions, confirmation, focus, responsive navigation và lỗi không lộ nội dung kỹ thuật.

## 10. Manual verification

- Đọc/đối chiếu controller, DTO, JobRules, application transitions và API client.
- Kiểm tra trực quan screenshot; kiểm tra browser tự động có thao tác thật trên DOM với HTTP mock.
- API Gateway `localhost:8080` không kết nối được trong phiên này. Chưa xác minh live data, token thật, membership thật, MinIO upload thật, notification email thật hoặc concurrency giữa nhiều người dùng.
- Không khởi động/triển khai backend hoặc hạ tầng để vượt phạm vi yêu cầu. Live test vẫn có trong `e2e/live-gateway.spec.ts`, bật bằng `LIVE_E2E=1` khi Gateway và dữ liệu reference sẵn sàng.
- Live script cần các mã reference có sẵn của môi trường test; không tự seed production. Tài khoản/Company/Job/Application test không có API xóa đầy đủ, nên chỉ chạy live trên môi trường kiểm thử được phép.

## 11. Giới hạn do backend contract

1. Không có Company list/membership-role endpoint công khai. Registry theo tài khoản chỉ là tiện ích điều hướng. Chỉ biết OWNER sau create thành công trên trình duyệt này; không suy diễn RECRUITER từ Company GET. OWNER mất dữ liệu trình duyệt chưa thể khôi phục owner controls bằng API hiện tại. Backend vẫn kiểm tra mọi thao tác.
2. Không có catalog location/category công khai. Gợi ý lấy từ tối đa 100 Job gần nhất, không phải catalog đầy đủ; mã quản trị viên trong phần nâng cao vẫn cần cho reference chưa xuất hiện.
3. Không có Application status filter/list toàn Company. Chọn Company → Job trước khi xem; không tạo bộ lọc giả trên một trang kết quả.
4. Không có download CV public cho Employer. Chỉ metadata CV, danh tính snapshot và cover letter được hiển thị.
5. Kiểm tra đã ứng tuyển/tìm tin riêng cần duyệt các trang. Có thể tốn nhiều request khi dữ liệu lớn; unique constraint/authorization backend vẫn là nguồn quyết định.
6. CV deletion hiện không bị chặn vì đã ứng tuyển; snapshot Application giữ nguyên. Không tự thêm hạn chế backend. Có thông báo thân thiện nếu API trả CV_IN_USE.
7. Không thêm trạng thái rút đơn, timeline giả, featured jobs, số liệu thống kê giả hoặc notification inbox.
8. Build vẫn có advisory bundle >500 kB và annotation từ Zod như baseline; chưa mở rộng phạm vi sang tối ưu bundle/dependency.

## 12. Git status

Chỉ Frontend và tài liệu thay đổi; không commit hoặc push. Bản ghi `git status --short` cuối được đính kèm dưới đây.


```text
 M Docs/progress/project-progress.md
 M Frontend/e2e/frontend.spec.ts
 M Frontend/e2e/live-gateway.spec.ts
 M Frontend/src/api/errors.ts
 M Frontend/src/app/AppLayout.tsx
 M Frontend/src/app/Guards.tsx
 M Frontend/src/components/DesignSystem.tsx
 M Frontend/src/components/Ui.tsx
 M Frontend/src/features/auth/AuthContext.tsx
 M Frontend/src/features/auth/AuthPages.tsx
 M Frontend/src/features/candidate/CandidatePages.tsx
 M Frontend/src/features/candidate/JobApplyPage.tsx
 M Frontend/src/features/company/registry.ts
 M Frontend/src/features/dashboard/DashboardPages.tsx
 M Frontend/src/features/employer/EmployerPages.tsx
 M Frontend/src/features/jobs/FilterSidebar.tsx
 M Frontend/src/features/jobs/JobBoardHome.tsx
 M Frontend/src/features/jobs/JobBoardPages.tsx
 M Frontend/src/features/jobs/JobCard.tsx
 M Frontend/src/features/jobs/MarketingSections.tsx
 M Frontend/src/features/jobs/SearchBar.tsx
 M Frontend/src/features/jobs/schemas.ts
 M Frontend/src/main.tsx
 M Frontend/src/routes/Router.tsx
 M Frontend/src/test/security.test.tsx
 M Frontend/src/test/server.ts
?? Docs/ux-audit.md
?? Docs/ux-report.md
?? Frontend/e2e/ux-responsive.spec.ts
?? Frontend/src/api/lookups.ts
?? Frontend/src/components/useFocusScope.ts
?? Frontend/src/features/candidate/CvManager.tsx
?? Frontend/src/features/company/CompanySummary.tsx
?? Frontend/src/features/employer/EmployerWorkspace.tsx
?? Frontend/src/features/employer/JobForm.tsx
?? Frontend/src/features/employer/RecruitmentLists.tsx
?? Frontend/src/features/jobs/ReferenceSelect.tsx
?? Frontend/src/styles/ux.css
?? Frontend/src/test/ux-flows.test.tsx
?? Frontend/src/utils/navigation.ts
```
