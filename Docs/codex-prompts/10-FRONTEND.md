# PROMPT 10 — REACT FRONTEND

Đọc rules/docs/OpenAPI/progress; backend E2E pass. Chỉ làm `frontend` và CORS/config cần thiết.

## Foundation

React + Vite + TypeScript nếu project cho phép, Tailwind, React Router, TanStack Query. Phân lớp pages/components/features/api/auth; `VITE_API_BASE_URL` trỏ Gateway; không gọi domain port. API client parse response/error contract, gửi correlation ID khi cần, không log secret.

## Auth

Register/login/logout/refresh. Không lưu password. Chọn storage/token strategy nhất quán với backend và ghi rủi ro; refresh single-flight để nhiều 401 không tạo nhiều rotation; tránh loop; logout xóa state. Protected routes và menu theo role, nhưng backend vẫn authorize.

## Screens

Candidate: profile/CV PDF, Job filter/page/detail, apply, application history. Employer: Company/member, Job CRUD/publish/close, applicants/status. Admin: account status, Category/Location. Có loading skeleton, empty/error/retry, form validation, disabled submit, confirmation cho destructive actions, accessible labels/keyboard và responsive layout.

## Tests

Lint/typecheck/unit/component với API mocks; auth refresh/race, protected role, forms, pagination, upload validation. Browser E2E core flow qua Gateway nếu environment sẵn. `npm` commands theo package manager hiện có, không đổi lockfile tool tùy tiện. Build production pass; báo routes/screens/tests/known UX; cập nhật progress và dừng.

