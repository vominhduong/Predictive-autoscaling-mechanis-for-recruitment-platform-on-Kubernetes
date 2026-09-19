# 05 — API Contracts

## 1. Quy ước

- Base path `/api/v1`; JSON `camelCase`; thời gian ISO-8601 UTC; ID dùng UUID.
- JWT: `Authorization: Bearer <token>`.
- Pagination bắt đầu `page=0`; `size` tối đa 100.

### Success

```json
{"success":true,"message":"Request completed","data":{},"timestamp":"2026-09-19T10:30:00Z"}
```

### Error

```json
{
  "success": false,
  "code": "APPLICATION_ALREADY_EXISTS",
  "message": "You have already applied for this job",
  "fieldErrors": [],
  "traceId": "6c493e...",
  "timestamp": "2026-09-19T10:30:00Z"
}
```

### Page data

```json
{"content":[],"page":0,"size":20,"totalElements":0,"totalPages":0,"first":true,"last":true}
```

## 2. Auth API

| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký Candidate/Employer |
| POST | `/auth/login` | Public | Đăng nhập |
| POST | `/auth/refresh` | Refresh token | Rotate token pair |
| POST | `/auth/logout` | User | Thu hồi refresh token |
| PUT | `/auth/password` | User | Đổi password |

Register request:

```json
{"email":"candidate@example.com","password":"StrongPass@123","role":"CANDIDATE"}
```

Login response data:

```json
{"accessToken":"...","refreshToken":"...","tokenType":"Bearer","expiresIn":1800}
```

## 3. User API

| Method | Endpoint | Role |
|---|---|---|
| GET/PUT | `/candidates/me` | Candidate |
| POST | `/candidates/me/cvs` | Candidate — multipart PDF |
| GET | `/candidates/me/cvs` | Candidate |
| DELETE | `/candidates/me/cvs/{cvId}` | CV owner |
| POST | `/companies` | Employer |
| GET | `/companies/{companyId}` | Public |
| PUT | `/companies/{companyId}` | Company manager |
| POST | `/companies/{companyId}/members` | Company owner |

Internal:

- `GET /internal/cvs/{cvId}/validation?candidateId=...`: CV ownership + snapshot.
- `GET /internal/companies/{companyId}/authorization?userId=...`: Company permission.

## 4. Job API

| Method | Endpoint | Role/Mục đích |
|---|---|---|
| POST | `/jobs` | Employer — tạo DRAFT |
| PUT | `/jobs/{jobId}` | Job owner — cập nhật |
| PATCH | `/jobs/{jobId}/status` | Job owner — publish/close |
| GET | `/jobs/{jobId}` | Public — chi tiết |
| GET | `/jobs` | Public — search/filter/page |
| GET | `/employer/jobs` | Employer — Job được quản lý |
| DELETE | `/jobs/{jobId}` | Owner — chỉ DRAFT nếu policy cho phép |

```http
GET /api/v1/jobs?keyword=java&locationId={uuid}&categoryId={uuid}&salaryMin=15000000&page=0&size=20&sort=createdAt,desc
```

Create Job:

```json
{
  "companyId":"uuid","title":"Junior Java Developer",
  "description":"...","requirements":"...",
  "salaryMin":15000000,"salaryMax":25000000,"negotiable":false,
  "locationId":"uuid","categoryId":"uuid","deadline":"2026-10-31"
}
```

Internal: `GET /internal/jobs/{jobId}/eligibility` trả status, deadline và Job/owner snapshot.

## 5. Application API

| Method | Endpoint | Role/Mục đích |
|---|---|---|
| POST | `/applications` | Candidate — Apply |
| GET | `/applications/me` | Candidate — hồ sơ của mình |
| GET | `/applications/{id}` | Candidate/Job owner |
| GET | `/employer/jobs/{jobId}/applications` | Job owner |
| PATCH | `/applications/{id}/status` | Job owner |

Apply request:

```json
{"jobId":"uuid","cvId":"uuid","coverLetter":"Tôi mong muốn ứng tuyển..."}
```

Trả `201 Created`, trạng thái `APPLIED`.

Status request:

```json
{"newStatus":"INTERVIEW","note":"Interview at 09:00 UTC"}
```

## 6. Admin API

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/admin/users` | Danh sách tài khoản |
| PATCH | `/admin/users/{userId}/status` | Khóa/mở tài khoản |
| POST/PUT/DELETE | `/admin/categories/**` | Quản lý Category |
| POST/PUT/DELETE | `/admin/locations/**` | Quản lý Location |

## 7. HTTP status/error code

| HTTP | Error code |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_REQUEST` |
| 401 | `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `UNAUTHORIZED` |
| 403 | `ACCESS_DENIED`, `RESOURCE_FORBIDDEN` |
| 404 | `USER_NOT_FOUND`, `JOB_NOT_FOUND`, `CV_NOT_FOUND`, `APPLICATION_NOT_FOUND` |
| 409 | `EMAIL_ALREADY_EXISTS`, `APPLICATION_ALREADY_EXISTS`, `INVALID_STATUS_TRANSITION` |
| 413/415 | `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE` |
| 429 | `RATE_LIMIT_EXCEEDED` |
| 503 | `DEPENDENCY_UNAVAILABLE` |

## 8. Event contract mẫu

```json
{
  "eventId":"uuid","eventType":"APPLICATION_SUBMITTED",
  "occurredAt":"2026-09-19T10:30:00Z",
  "data":{
    "applicationId":"uuid","jobId":"uuid","candidateId":"uuid",
    "candidateEmail":"candidate@example.com","employerEmail":"employer@example.com"
  }
}
```

Producer không chờ Notification Service gửi email xong mới trả response.

