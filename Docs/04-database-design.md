# 04 — Database Design

## 1. Quy ước

- PostgreSQL; Database per Service; UUID làm khóa chính.
- Thời gian lưu UTC bằng `timestamptz`.
- Bảng nghiệp vụ có `created_at`, `updated_at`; Entity cập nhật quan trọng có `version` để optimistic locking.
- Không có foreign key xuyên database; Flyway quản lý migration.

## 2. `auth_db`

### `users`

| Cột | Kiểu/Ràng buộc |
|---|---|
| `id` | UUID PK |
| `email` | varchar(255), unique, not null, lowercase |
| `password_hash` | varchar(255), not null |
| `role` | CANDIDATE/EMPLOYER/ADMIN |
| `status` | ACTIVE/LOCKED/DISABLED |
| `email_verified` | boolean, default false |
| `created_at`, `updated_at` | timestamptz |

Index unique trên `lower(email)`.

### `refresh_tokens`

`id` UUID PK, `user_id`, `token_hash` unique, `expires_at`, `revoked_at`, `created_at`. Không lưu raw token. Index `(user_id, expires_at)`.

## 3. `user_db`

### `candidate_profiles`

`id` UUID PK, `user_id` unique, `full_name`, `phone`, `headline`, `summary`, `location_id`, timestamps.

### `companies`

`id` UUID PK, `name`, `description`, `address`, `logo_object_key`, `status`, timestamps.

### `company_members`

`id` UUID PK, `company_id` FK nội bộ, `user_id` logical ID, `member_role` OWNER/RECRUITER. Unique `(company_id, user_id)`; index `user_id`.

### `cvs`

| Cột | Kiểu/Ràng buộc |
|---|---|
| `id` | UUID PK |
| `candidate_id` | UUID logical ID, not null |
| `file_name` | varchar(255) |
| `object_key` | varchar(500), unique |
| `content_type` | varchar(100), PDF |
| `size_bytes` | bigint |
| `is_default` | boolean |
| `created_at` | timestamptz |

Index `(candidate_id, created_at desc)`.

## 4. `job_db`

### `jobs`

| Cột | Kiểu/Ràng buộc |
|---|---|
| `id` | UUID PK |
| `company_id`, `created_by` | UUID logical IDs |
| `title` | varchar(255), not null |
| `description`, `requirements` | text, not null |
| `salary_min`, `salary_max` | numeric(15,2), nullable |
| `negotiable` | boolean |
| `location_id`, `category_id` | UUID, not null |
| `status` | DRAFT/PUBLISHED/CLOSED |
| `deadline` | date |
| `published_at` | timestamptz, nullable |
| `created_at`, `updated_at` | timestamptz |
| `version` | bigint |

Indexes: `(status, created_at desc)`, `company_id`, `location_id`, `category_id`, `salary_min`; thêm full-text index khi cần.

### `categories`, `locations`

Mỗi bảng gồm `id`, `code` unique, `name`, `active`, timestamps.

## 5. `application_db`

### `applications`

| Cột | Kiểu/Ràng buộc |
|---|---|
| `id` | UUID PK |
| `job_id`, `candidate_id` | UUID logical IDs |
| `employer_id`, `company_id` | UUID snapshot |
| `cv_id` | UUID logical ID |
| `cv_object_key_snapshot` | varchar(500) |
| `job_title_snapshot` | varchar(255) |
| `candidate_name_snapshot` | varchar(150) |
| `cover_letter` | text, nullable |
| `status` | APPLIED/SCREENING/INTERVIEW/OFFER/HIRED/REJECTED |
| `created_at`, `updated_at` | timestamptz |
| `version` | bigint |

Unique `(candidate_id, job_id)`. Indexes `(candidate_id, created_at desc)`, `(job_id, status)`, `(employer_id, created_at desc)`.

### `application_status_histories`

`id` UUID PK, `application_id` FK nội bộ, `from_status`, `to_status`, `changed_by`, `note`, `created_at`.

### `processed_events`

`event_id` UUID PK, `event_type`, `processed_at`; dùng chống xử lý trùng.

## 6. `notification_db`

`notification_logs`: `id`, `event_id` unique, `recipient`, `type`, `subject`, `status`, `attempt_count`, `error_message`, `sent_at`, `created_at`.



