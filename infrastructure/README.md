# Recruitment Platform development infrastructure

Docker Compose này chỉ chạy hạ tầng dùng chung cho môi trường development: PostgreSQL, Redis, RabbitMQ, MinIO và Mailpit. Các Spring Boot service không nằm trong Compose này.

## Chuẩn bị biến môi trường

Chạy lệnh từ thư mục gốc của repository.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Chỉnh các giá trị minh họa trong `.env` trước khi sử dụng. File `.env` đã được Git bỏ qua.

## Khởi động và kiểm tra

Khởi động toàn bộ hạ tầng ở chế độ nền:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
```

Kiểm tra container và trạng thái health:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml ps
```

Xem log của toàn bộ hạ tầng:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f
```

Xem log của một service, ví dụ PostgreSQL:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f postgres
```

Dừng container nhưng giữ nguyên container và dữ liệu:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml stop
```

Dừng và xóa container/network của Compose nhưng vẫn giữ named volume và dữ liệu:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

Xóa container, network và toàn bộ named volume của dự án:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml down --volumes
```

> Cảnh báo: lệnh `down --volumes` xóa vĩnh viễn dữ liệu PostgreSQL, Redis, RabbitMQ và MinIO của dự án này. Chỉ chạy khi chủ động muốn tạo lại môi trường sạch.

## Địa chỉ dịch vụ local

| Dịch vụ | Địa chỉ |
|---|---|
| RabbitMQ Management | <http://localhost:15672> |
| MinIO Console | <http://localhost:9001> |
| MinIO API | <http://localhost:9000> |
| Mailpit Web UI | <http://localhost:8025> |
| Mailpit SMTP | `localhost:1025` |

Các port có thể thay đổi trong `.env`.

## Kết nối PostgreSQL

Khi Spring Boot chạy trực tiếp trên host, dùng host port trong `.env`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/auth_db
spring.datasource.username=recruitment
spring.datasource.password=change-me
```

Thay `auth_db` bằng `user_db`, `job_db`, `application_db` hoặc `notification_db` cho service tương ứng. Nên đọc username/password từ biến môi trường thay vì lưu credential thật trong `application.properties`.

Khi Spring Boot chạy trong cùng Docker network, dùng DNS service name `postgres` và container port `5432`:

```properties
spring.datasource.url=jdbc:postgresql://postgres:5432/auth_db
```

Container của ứng dụng phải tham gia external network `recruitment-network`. Host port không được dùng cho giao tiếp nội bộ giữa các container.

## Kiểm tra các database đã tạo

Sau khi PostgreSQL healthy, liệt kê database bằng:

```bash
docker exec recruitment-postgres psql -U recruitment -d postgres -c "SELECT datname FROM pg_database WHERE datname IN ('auth_db', 'user_db', 'job_db', 'application_db', 'notification_db') ORDER BY datname;"
```

Script `postgres/init-databases.sql` chỉ chạy khi PostgreSQL khởi tạo một data volume trống lần đầu. Nếu volume đã tồn tại, sửa script sẽ không tự động thay đổi các database trong volume đó.
