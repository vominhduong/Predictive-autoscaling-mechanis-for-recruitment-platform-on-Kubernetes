# Tạo tải workflow ứng viên nộp hồ sơ

Bộ test dựa trên DTO/controller thực tế của repository. Không thay đổi backend. Mỗi lượt gọi GET job → POST application
(`jobId`, `cvId`, `coverLetter`) → GET application. POST thành công trả HTTP 201 và `data.id`; GET chi tiết chứa
`data.application`.

## 1. Chuẩn bị trên PowerShell

Giải nén/copy các file vào `ML/test_load`, giữ nguyên script khác. Mở PowerShell:

```powershell
cd C:\Users\vomin\Downloads\recruitment-platform\ML\test_load
Copy-Item application.config.example.json application.config.json
Copy-Item application-accounts.example.json application-accounts.json
notepad application.config.json
notepad application-accounts.json
New-Item -ItemType Directory -Force output | Out-Null
```

Điền jobIds có thật, đang PUBLISHED và chưa hết hạn. Điền tài khoản CANDIDATE thử có thật vào accounts (mảng
email/password); không dùng tài khoản cá nhân thật. Nếu tạo mới bằng công cụ, thay nội dung accounts bằng `[]` rồi
truyền `--create-count N` rõ ràng. Công cụ không tự tạo hàng loạt khi không có flag này.

Công cụ đăng nhập, đọc tất cả trang đơn đã nộp, bỏ cặp đã ứng tuyển, dùng CV hiện có hoặc upload PDF giả khi chưa có CV.
Không xóa dữ liệu. Chạy lại dùng các tài khoản cũ sẽ bỏ các cặp đã thành công; có thể bổ sung tài khoản/job mới.

Các file accounts/runtime/config thực tế và output phải được gitignore. Runtime chứa access token; không chia sẻ. Ví dụ
cấu hình không chứa bí mật.

## 2. Thông báo email trước test

Backend tạo outbox, RabbitMQ chuyển sự kiện sang notification-service, processor gọi Brevo cho APPLICATION_SUBMITTED.
Repository không có công tắc tắt email rõ ràng cho luồng này.

Trên môi trường thử, cấu hình `BREVO_API_URL` của notification-service trỏ tới mock HTTP nội bộ trả 2xx (xem
BrevoEmailSender), cùng sender/API key giả nếu validation yêu cầu. Việc này phải do người vận hành cấu hình riêng; bộ
test không thay cluster. Giữ consumer chạy để vẫn đo xử lý notification. Không coi việc để API key trống là gửi thử
thành công: nó có thể gây retry/DLQ.

Chỉ đặt `EMAIL_TEST_ACK=yes` sau khi đã xác minh cấu hình gửi thử phù hợp. Với tài khoản có sẵn, email có thể là địa chỉ
thật; cần kiểm tra.

## 3. Smoke: một đơn thật trong môi trường thử

```powershell
python prepare_applications.py --config application.config.json --mode smoke
$scriptDir = (Get-Location).Path

docker run --rm --mount "type=bind,source=$scriptDir,target=/scripts" grafana/k6 run -e EMAIL_TEST_ACK=yes /scripts/application-workflow.js
```

Nếu cần tạo 1 ứng viên thử, khi accounts là `[]`:

```powershell
python prepare_applications.py --config application.config.json --mode smoke --create-count 1
```

Email tạo mới dùng domain example.invalid. Nếu môi trường bổ sung quy tắc chặn domain này, dùng tài khoản thử có sẵn.

Smoke tiêu thụ một cặp. Không dùng lại runtime cho lần chạy tiếp theo: luôn prepare lại để loại cặp đã nộp.

## 4. Constant: 1 lượt/giây trong 5 phút

```powershell
python prepare_applications.py --config application.config.json --mode constant --rate 1 --duration 300

docker run --rm --mount "type=bind,source=$scriptDir,target=/scripts" grafana/k6 run -e EMAIL_TEST_ACK=yes -e PREALLOCATED_VUS=30 -e MAX_VUS=150 /scripts/application-workflow.js
```

Thay rate bằng 2 hoặc 5 sau khi mức thấp chạy ổn. Rate constant phải là số nguyên dương. Mỗi lượt có 3 request ngoài; lý
tưởng 1 lượt/giây ≈ 3 RPS qua gateway. Request nội bộ làm RPS tại từng service khác nhau.

Cần ceil (rate × duration) + 1 cặp cho constant (có 1 cặp dự phòng). Ví dụ 1 × 300 cần 301 cặp; 101 ứng viên × 3 việc
làm tối đa 303 cặp trước khi loại các đơn đã có. Không tự tạo số tài khoản này; lựa chọn job pool/tài khoản theo cụm.

## 5. Ramp: 1 → 2 → 5 → giữ → 1

```powershell
python prepare_applications.py --config application.config.json --mode ramp --duration 300

docker run --rm --mount "type=bind,source=$scriptDir,target=/scripts" grafana/k6 run -e EMAIL_TEST_ACK=yes /scripts/application-workflow.js
```

Hai ramp đầu 60 giây, giữ 5 lượt/giây theo duration, giảm về 1 trong 60 giây. Tổng 480 giây khi duration=300. Cần 1981
cặp (tích phân tốc độ + 1). Rate ramp cố định theo các stage; tham số --rate chỉ có ý nghĩa ở constant.

## 6. Token, kết quả và giới hạn

Chuẩn bị và đăng nhập trước giai đoạn đo; không refresh trong k6 nên không có tranh chấp rotation giữa VU. Công cụ và
setup chặn nếu token không đủ hạn cho cả test cộng 120 giây. Rút ngắn test hoặc chuẩn bị lại nếu bị chặn. Chạy ngay sau
prepare.

Index `execution.scenario.iterationInTest` lấy cặp một lần; không random/modulo. Hỗ trợ một tiến trình Docker; không tái
sử dụng cùng runtime trong các tiến trình độc lập. Không có POST retry tự động: timeout có thể đã tạo đơn, phải prepare
lại để kiểm tra dữ liệu.

Kết quả trong `output/<runId>-summary.json` và `output/<runId>-metadata.json`. Metadata có thời gian UTC (start ước
lượng từ testRunDurationMs), cấu hình, thành công/thất bại. Summary có thời gian request/workflow, checks và metrics
HTTP. Khi thiếu VU, dropped_iterations tăng; đó là số lượt không được phát, không phải đơn nghiệp vụ thất bại. Threshold
lỗi/checks là tiêu chí kiểm tra kỹ thuật ban đầu, cần đặt thêm SLO latency theo khóa luận.

HTTP 401: token; 403: role/quyền; 409: trùng hoặc job đóng; 400: validation; 5xx/timeout: cần đối chiếu log và metrics.
Script không in response body, token hay mật khẩu. Thất bại bước trước bỏ bước phụ thuộc; vẫn tăng workflow_failed.

Trực tiếp: gateway, job-service, application-service. Gián tiếp khi apply: job eligibility, user CV validation,
database, outbox/RabbitMQ; notification dùng user notification-context và Brevo. Tải notification bất đồng bộ không nằm
trong thời gian workflow.

## 7. Thu Prometheus

Ghi runId và thời gian UTC từ metadata. Sau lần chạy, từ root repo xuất đúng khoảng thời gian (điều chỉnh
--start/--end):

```powershell
python ML/data/export_svc_new.py --url http://192.168.110.156:30090 --start "2026-10-11T06:30:00Z" --end "2026-10-11T06:40:00Z" --output ML/test_load/output/application-svc.csv
```

Prometheus thu liên tục trong khi k6 chạy; exporter dùng dữ liệu lịch sử sau chạy. Giữ thêm khoảng trước/sau tải để quan
sát. Không coi RPS tổng của mọi service là RPS đầu vào duy nhất vì có request nội bộ.

## 8. Kiểm tra cục bộ

```powershell
python -m unittest discover -s . -p "test_prepare_applications.py" -v
```

Các test kiểm tra tính số cặp, PDF và prepare với API giả có phân trang/đơn đã tồn tại. Smoke thật phải chạy trên cụm
của bạn. Không tự reset database hay chạy tải cao.
