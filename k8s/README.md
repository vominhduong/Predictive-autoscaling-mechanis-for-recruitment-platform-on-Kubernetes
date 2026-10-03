# Kubernetes tối giản

7 image ứng dụng dùng `vmduong2005/<service>:latest`, `imagePullPolicy: Always`; repository chưa xác nhận tag Docker Hub khác. Cổng container: gateway/frontend **8080**, auth **8081**, user **8082**, job **8083**, application **8084**, notification **8085**. Service frontend dùng **80 → 8080**; tất cả Service là ClusterIP.

Cần cluster có DNS/CNI và StorageClass mặc định cấp được PVC, hoặc PV tương ứng được chuẩn bị trước. PVC: PostgreSQL **5Gi**, RabbitMQ **2Gi**, MinIO **5Gi**, Redis **1Gi** (giữ persistence `/data` như Compose). Không dùng bộ này đồng thời với manifest cũ cùng namespace/tên resource.

## Chuẩn bị cấu hình

`configmap.yaml` chứa cấu hình không nhạy cảm, dùng DNS Service. `localhost` chỉ xuất hiện ở CORS cho trình duyệt port-forward. Auth dùng `DB_HOST/DB_PORT/DB_NAME`; các dịch vụ khác dùng JDBC URL. Redis chưa có client được cấu hình trong các service hiện tại; vẫn được giữ theo Compose.

Copy Secret example, thay toàn bộ `REPLACE_WITH_*` bằng giá trị riêng tương ứng trong `.env`. Kubernetes không tự đọc `.env`. File `secret.yaml` đã được ignore bởi `k8s/.gitignore`.

```powershell
Copy-Item k8s/secret.example.yaml k8s/secret.yaml
```

Thay username/password PostgreSQL, RabbitMQ, MinIO, internal token và Brevo API key. MinIO password ít nhất 8 ký tự. Sửa `BREVO_SENDER_EMAIL` trong ConfigMap thành sender đã xác minh. Notification hiện gửi `APPLICATION_SUBMITTED` qua Brevo; thiếu cấu hình này sẽ không gửi được email đó. Thông báo đổi trạng thái dùng SMTP Mailpit (`mailpit:1025`), không cần SMTP username/password.

## Triển khai thủ công

Các lệnh dưới đây dành cho người dùng chạy sau khi kiểm tra kubeconfig:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Cặp RSA PEM khớp nhau, giữ ngoài Git; private key dạng PKCS#8.
$privateKey = "C:\Users\vomin\Downloads\recruitment-platform\Services\api-gateway\src\test\resources\keys\test-private.pem"
$publicKey  = "C:\Users\vomin\Downloads\recruitment-platform\Services\api-gateway\src\test\resources\keys\test-public.pem"
kubectl -n recruitment create secret generic jwt-keys --from-file=dev-private.pem="$privateKey" --from-file=dev-public.pem="$publicKey"

kubectl apply -f k8s/infrastructure.yaml
kubectl -n recruitment rollout status deployment/postgres --timeout=600s
kubectl -n recruitment rollout status statefulset/rabbitmq --timeout=600s
kubectl -n recruitment rollout status deployment/minio --timeout=600s
kubectl -n recruitment wait --for=condition=complete job/minio-init --timeout=600s
kubectl apply -f k8s/backend-services.yaml
kubectl -n recruitment rollout status deployment/api-gateway --timeout=600s
kubectl apply -f k8s/frontend.yaml
```

Auth mount cả hai PEM; gateway chỉ mount public PEM bằng `secret.items`. Không mount private key cho dịch vụ khác. Không chạy lại lệnh `create secret` nếu Secret đã tồn tại.

Script PostgreSQL tạo 5 database **chỉ khi volume dữ liệu mới**. Thay ConfigMap không tự khởi tạo lại volume cũ; đổi Secret cũng không tự đổi password đã lưu trong database/RabbitMQ. Job MinIO tạo bucket `recruitment-cvs` private; Job đã hoàn tất không tự chạy lại khi đổi cấu hình. Kubernetes không có `depends_on`, ứng dụng có thể retry/restart trong lúc phụ thuộc đang lên.

## Kiểm tra và truy cập

```powershell
kubectl -n recruitment get pods,svc,pvc,jobs
kubectl -n recruitment logs deployment/api-gateway --tail=100
kubectl -n recruitment logs deployment/notification-service --tail=100
kubectl -n recruitment logs job/minio-init
# Chạy mỗi lệnh port-forward trong một terminal riêng
kubectl -n recruitment port-forward service/frontend 3000:80
kubectl -n recruitment port-forward service/api-gateway 8080:8080
# Tùy chọn xem email SMTP
kubectl -n recruitment port-forward service/mailpit 8025:8025
```

Mở `http://localhost:3000`; gateway ở `http://localhost:8080`, Mailpit ở `http://localhost:8025`. Nginx đã proxy `/api/` sang `api-gateway:8080`. Frontend dùng `VITE_API_BASE_URL` lúc **build**, mặc định `window.location.origin`; thêm env vào Pod không đổi bundle. Chưa kiểm chứng nội dung image Docker Hub: nếu image đã đóng cứng API URL khác, manifest này không sửa được URL đó. Backend probe dùng `/actuator/health/readiness` và `/actuator/health/liveness`; startup probe cho Java tối đa khoảng 10 phút.

## Xóa khi không dùng

```powershell
kubectl delete namespace recruitment
```

Lệnh này xóa toàn bộ resource trong namespace, gồm PVC; dữ liệu có thể bị xóa tùy reclaim policy của StorageClass/PV. Sao lưu trước nếu cần giữ dữ liệu.

Kiểm tra chuẩn bị: YAML đã parse và kiểm tra tham chiếu/selector/port/PVC cục bộ. Client dry-run dùng kubeconfig rỗng và địa chỉ loopback không phục vụ API để tránh kết nối context hiện tại; không lấy được OpenAPI schema nên chưa xác minh schema server, việc pull image hay runtime trên cluster. Resource limits là cấu hình khởi điểm local, cần điều chỉnh nếu JVM thiếu RAM. Không có tài nguyên nào được triển khai trong lần tạo file này.
