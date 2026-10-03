# Xem và tải CV của đơn ứng tuyển

## Nguyên nhân và luồng đã xác minh

Repository không có AGENTS.md trong cây dự án. Đã đọc README.md và infrastructure/README.md trước khi sửa.

1. `CandidateController` nhận multipart tại `POST /api/v1/candidates/me/cvs`.
2. `CvService.upload` kiểm tra PDF, ghi object có UUID riêng qua `MinioObjectStorage.put`, rồi lưu bảng `cvs`: tên, object key, content type, kích thước và chủ sở hữu.
3. `ApplicationService.apply` gọi `/internal/cvs/{id}/validation` để xác minh CV thuộc ứng viên. Bảng `applications` lưu `cv_id`, `cv_object_key_snapshot`, `cv_file_name_snapshot` tại thời điểm ứng tuyển.
4. `ApplicationDtos.View` trả `cvFileName` từ snapshot. Trước bản sửa, storage chỉ có put/delete; không có API đọc nội dung. `RecruitmentLists.tsx` và `CandidatePages.tsx` chỉ render tên file.

## Thay đổi

`GET /api/v1/applications/{id}/cv?download=false|true` yêu cầu vai trò EMPLOYER. Backend lấy tin tuyển dụng của đơn, kiểm tra quyền quản lý công ty hiện tại qua cơ chế membership đang có, sau đó mới đọc object key từ snapshot. API không nhận object key do trình duyệt chỉ định. Không tra CV mặc định/current CV của ứng viên.

Application service gọi endpoint nội bộ `/internal/cv-file`, được `InternalApiFilter` bảo vệ bằng internal token. Gateway không route `/internal/**`. User service đọc MinIO private và trả bytes về backend. Không đưa hostname Docker, token nội bộ hoặc URL MinIO ra frontend.

Response có Content-Type, Content-Length, Content-Disposition UTF-8 (inline cho PDF; attachment khi tải hoặc định dạng khác), Cache-Control: no-store và nosniff. Tên file bỏ phần đường dẫn và ký tự điều khiển. PDF chỉ được preview khi metadata là application/pdf và bytes bắt đầu bằng `%PDF-`.

Frontend dùng Axios hiện có để gửi JWT, nhận Blob, mở PDF trong iframe. Object URL được thu hồi khi đóng viewer/unmount; URL tải xuống được thu hồi sau 60 giây hoặc khi unmount. Request đang chạy bị hủy khi unmount. Có loading, chống bấm lặp, thông báo thiếu file, 401, 403, 404 và lỗi dịch vụ. Định dạng khác được tải xuống với thông báo rõ. Không dùng signed URL nên không có hạn URL MinIO; hết hạn JWT đi qua cơ chế refresh hiện có.

## File thuộc bản sửa này

- `Frontend/src/api/services.ts`
- `Frontend/src/features/employer/ApplicationCv.tsx` (mới)
- `Frontend/src/features/employer/RecruitmentLists.tsx`
- `Frontend/src/features/candidate/CandidatePages.tsx` (màn hình chi tiết dùng chung; nút CV chỉ hiện ở route employer)
- `Services/application-service/src/main/java/com/example/application_service/client/InternalServiceClient.java`
- `Services/application-service/src/main/java/com/example/application_service/controller/ApplicationController.java`
- `Services/application-service/src/main/java/com/example/application_service/service/ApplicationService.java`
- `Services/user-service/src/main/java/com/example/user_service/controller/InternalCvFileController.java` (mới)
- `Services/user-service/src/main/java/com/example/user_service/storage/ObjectStorage.java`
- `Services/user-service/src/main/java/com/example/user_service/storage/MinioObjectStorage.java`
- `Frontend/src/test/application-cv.test.tsx` (mới)
- `Frontend/e2e/application-cv.spec.ts` (mới)
- `Services/api-gateway/src/test/java/com/example/api_gateway/ApiGatewayApplicationTests.java`
- `Services/application-service/src/test/java/com/example/application_service/ApplicationServiceApplicationTests.java`
- `Services/user-service/src/test/java/com/example/user_service/UserServiceApplicationTests.java`
- `Services/user-service/src/test/java/com/example/user_service/CvServiceCompensationTest.java` (bổ sung phương thức cho test double)
- `Services/user-service/src/test/java/com/example/user_service/MinioCvStorageTest.java` (mới)
- `Services/{application-service,user-service}/src/test/resources/cv-preview.pdf` (hai fixture mới, PDF một trang có nội dung)
- `docs/employer-cv.md` (tài liệu này)

Các thay đổi đã có sẵn ở notification, email, README, .env.example và infrastructure được giữ nguyên. Không sửa .env hoặc schema database.

## Kiểm thử và chạy lại

- Chạy `./mvnw.cmd -B test` trong application-service, user-service và api-gateway. Test dùng PostgreSQL/MinIO riêng qua Testcontainers, không xóa dữ liệu local.
- `MinioCvStorageTest`: upload/read bytes PDF thật, anonymous access 403, xóa object rồi đọc nhận CV_FILE_NOT_FOUND.
- Test application: employer đúng quyền nhận bytes và inline/attachment, employer khác/candidate bị 403, anonymous 401; đổi CV ở upstream vẫn đọc snapshot cũ; objectKey query không thay đổi file; object bị mất nhận 404.
- Test gateway: giả mạo X-User-* khi chưa đăng nhập bị chặn; JWT thông thường không route được endpoint đọc object nội bộ.
- Trong Frontend: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`.
- `npm.cmd run test:e2e -- e2e/application-cv.spec.ts --project=chromium`: trình duyệt thật mở viewer ở danh sách và chi tiết, kiểm tra Blob và file tải xuống trùng bytes fixture. API trong bài Playwright được mock; kiểm thử quyền và MinIO nằm ở backend.
- Build JAR: `./mvnw.cmd -B -DskipTests package` trong hai service sửa production code.

## Kiểm tra trên giao diện local

Nếu đang chạy image Docker cũ, build/recreate ba thành phần đã sửa từ thư mục gốc:

```powershell
docker compose up -d --build user-service application-service frontend
```

1. Ứng viên upload một PDF có nội dung, ứng tuyển một tin bằng CV đó.
2. Đăng nhập nhà tuyển dụng quản lý công ty của tin → Hồ sơ ứng tuyển → chọn công ty/tin.
3. Bấm Xem CV ở danh sách: PDF xuất hiện trong viewer. Đóng CV, bấm Tải CV và mở file đã tải.
4. Vào chi tiết hồ sơ, thử lại hai nút.
5. Ứng viên upload CV khác rồi quay lại đơn cũ: nội dung vẫn là CV đã nộp.
6. Tài khoản employer ngoài công ty gọi API CV của đơn: 403. Không gửi Bearer: 401. Đoán object key không cấp quyền truy cập.
7. Với dữ liệu thử nghiệm riêng, xóa CV gốc rồi thử mở: thông báo file không còn tồn tại, không thay bằng CV mới.

## Giới hạn

- Upload hiện chỉ hỗ trợ PDF và được giữ nguyên. DOC/DOCX chỉ có fallback tải xuống nếu dữ liệu loại này xuất hiện; không thêm upload/chuyển đổi Word.
- Xóa CV hiện xóa object vật lý. Bản sửa không thay đổi chính sách lưu trữ này; đơn cũ tham chiếu file đã xóa sẽ báo lỗi rõ ràng. Muốn giữ file sau khi ứng viên xóa cần chính sách retention riêng.
- File được buffer trong bộ nhớ ở backend và trình duyệt; upload hiện mặc định tối đa 5 MiB. Chưa hỗ trợ streaming/Range cho file lớn.
- Chưa triển khai lại stack Docker đang chạy hoặc chạy một hành trình xuyên suốt toàn bộ stack thật. Kiểm thử trình duyệt dùng API mock, backend dùng PostgreSQL/MinIO thật và upstream stub.
