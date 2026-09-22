# Quy tắc dùng bộ prompt

Đặt các file prompt vào `docs/codex-prompts/`. Mỗi lần chỉ gửi Codex **một file** theo thứ tự số.

Codex phải:

1. Đọc `docs/01-system-overview.md` đến `docs/05-api-contracts.md`, prompt hiện tại, `git status` và code liên quan.
2. Xác định phần nào đã hoàn thành; không tạo lại hoặc ghi đè code đúng.
3. Trước khi code, báo task, file dự kiến sửa và acceptance criteria.
4. Chỉ làm phạm vi prompt hiện tại; không tự chuyển file tiếp theo.
5. Không dùng Git destructive, không xóa volume, không sửa migration đã chạy, không commit secret.
6. Chạy test; sửa nguyên nhân đến khi pass, không disable test/security/Flyway.
7. Cập nhật `docs/progress/project-progress.md` gồm completed/in-progress/blocked, lệnh và test result.
8. Kết thúc bằng danh sách file đổi, test, cách kiểm tra thủ công, rủi ro còn lại rồi dừng.

Nếu bị giới hạn giữa chừng, lần sau gửi lại đúng prompt và thêm: “Đọc progress report và git diff, tiếp tục từ checkpoint; không làm lại phần đã hoàn thành.”

