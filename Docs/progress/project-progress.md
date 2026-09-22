# Recruitment Platform — Project Progress

Last updated: 2026-09-22 (Asia/Bangkok)

## Completed

### Prompt 01 — Baseline infrastructure

- Local Docker Compose defines PostgreSQL, Redis, RabbitMQ, MinIO and Mailpit on `recruitment-network`.
- PostgreSQL initialization creates `auth_db`, `user_db`, `job_db`, `application_db` and `notification_db`.

### Prompt 02 — Auth foundation

- Auth Service uses Java 21 bytecode, Spring Boot, Security, JPA, Validation, Actuator, PostgreSQL and Flyway.
- Flyway V1 owns `users` and `refresh_tokens`; its existing migration was not changed.
- PostgreSQL integration tests validate schema, repository behavior and case-insensitive email uniqueness.

### Prompt 03 — Register

- `POST /api/v1/auth/register` supports Candidate and Employer registration.
- Email normalization, password policy, BCrypt storage, duplicate handling, response DTOs and standard API errors are implemented.

### Prompt 04 — Login, JWT, refresh and logout

- `POST /api/v1/auth/login` normalizes email, verifies BCrypt credentials and returns indistinguishable `INVALID_CREDENTIALS` failures.
- Locked and disabled accounts are rejected with their dedicated error codes.
- Access Tokens use RS256 with `sub = userId`, `email`, `role`, `iss`, `iat`, `exp` and `jti` claims.
- JWT signature, expiry and issuer are validated. Access Token lifetime defaults to 1800 seconds.
- Refresh Tokens are opaque URL-safe random values; only SHA-256 hashes are stored in PostgreSQL.
- Refresh rotation uses a pessimistic database lock and revokes the previous token transactionally.
- Concurrent reuse permits exactly one successful rotation.
- `POST /api/v1/auth/logout` requires an Access Token, revokes the supplied Refresh Token idempotently and returns 204.
- Spring Security 401/403 responses use the standard JSON error contract with correlation/trace ID.
- Token lifecycle decisions use an injectable UTC `Clock` where deterministic time matters.
- Architecture docs now consistently reserve Redis for later cache/rate-limit/blacklist work and document PostgreSQL Refresh Token hashes.

### Prompt 05 — API Gateway

- API Gateway uses Spring Cloud Gateway Server WebFlux; it does not include Spring MVC, JPA, PostgreSQL, Flyway or Eureka.
- Public routes forward Auth, User, Job and Application API prefixes to configurable upstream URIs. Internal endpoints are not exposed.
- The Gateway verifies RS256 Access Tokens with the public key and issuer, reads the user ID from `sub`, and never contains a private signing key.
- Client-supplied `X-User-Id`, `X-User-Email` and `X-User-Role` headers are removed before verified identity headers are added.
- Security failures and upstream failures use the standard JSON error contract. Correlation IDs are validated, forwarded and returned.
- CORS is configurable by exact allowed origins. Connect and response timeouts are configured globally.

### Prompt 06 — User Service, Company and CV

- User Service runs on port 8082 and owns only `user_db`; Hibernate uses `ddl-auto=validate` and Flyway owns schema changes.
- Flyway V1 creates `candidate_profiles`, `companies`, `company_members` and `cvs` with UUID keys, uniqueness constraints, indexes, timestamps and optimistic-lock versions for mutable aggregate roots.
- Candidate endpoints create/read/update the authenticated user's profile and upload/list/delete that user's PDF CV metadata.
- CV validation checks extension, MIME type, PDF signature and configured size. Object keys are generated from trusted UUIDs and are not exposed in public responses.
- Company creation atomically creates its creator as OWNER. OWNER can update the Company and add RECRUITER members; duplicate members and client-assigned OWNER roles are rejected.
- Internal CV ownership and Company authorization contracts require a separate internal token and are not routed by Gateway.
- MinIO stores file bytes in the private `recruitment-cvs` bucket; PostgreSQL stores metadata and the private object key.

## Verification

Environment:

- Docker Desktop server 29.6.2.
- PostgreSQL Testcontainers image `postgres:17-alpine`.
- IntelliJ bundled JBR ran Maven with Java 25.0.3 while Maven compiled with `release 21`.

Commands:

```powershell
$env:JAVA_HOME = 'C:\Program Files\JetBrains\IntelliJ IDEA 2026.2\jbr'
.\mvnw.cmd clean verify
& 'C:\Program Files\JetBrains\IntelliJ IDEA 2026.2\jbr\bin\java.exe' -jar target\auth-service-0.0.1-SNAPSHOT.jar
```

Automated result on 2026-09-22:

- `BUILD SUCCESS`
- Tests run: 81
- Failures: 0
- Errors: 0
- Skipped: 0
- Includes Flyway/PostgreSQL integration, register/login, JWT signature/expiry/issuer, hashed token persistence, rotation/replay, expired/revoked/random token, concurrent refresh, authenticated logout and standard security errors.

Manual result against local `auth_db` and Auth Service port 8081:

- Register: success (`201` semantic response).
- Login: Bearer token pair, Access Token TTL 1800 seconds, Refresh Token TTL 604800 seconds.
- Refresh: returned a different Refresh Token.
- Reuse old Refresh Token: `401`.
- Authenticated logout: `204`.
- Refresh after logout: `401`.
- Database check: stored token hashes are 64 lowercase hexadecimal characters; raw tokens were not printed or persisted.

The first verification attempt could not initialize Testcontainers because Docker Desktop was stopped. Docker Desktop was started and the full command was rerun successfully. The Auth Service process used for manual verification was stopped cleanly afterward.

### API Gateway verification

Environment and resolved compatibility:

- Spring Boot 4.1.1.
- Spring Cloud BOM 2025.1.3.
- Spring Cloud Gateway Server WebFlux 5.0.3.
- Maven ran with the IntelliJ bundled JBR and compiled with Java release 21.

Automated result on 2026-09-22:

- Baseline before Prompt 05 changes: 1 test passed.
- Final `mvnw.cmd clean verify`: 13 tests passed, 0 failures, 0 errors and 0 skipped.
- Coverage includes routing and body preservation, public-route identity stripping, valid JWT identity propagation, missing/tampered/expired JWT rejection, internal-route denial, correlation ID behavior, CORS, upstream unavailable and upstream timeout.

Manual result with Auth Service on port 8081 and Gateway on port 8080:

- Register through Gateway: `201`.
- Login through Gateway: `200` and a valid RS256 Access Token.
- Missing token: `401`.
- Valid JWT passed Gateway authentication and reached an unavailable protected Application Service upstream: `503`.
- Tampered-signature token: `401`.
- Internal Auth endpoint through Gateway: `404`.
- Correlation ID `manual-gateway-001` was returned unchanged.
- Allowed-origin CORS preflight: `200`, with the configured origin and credentials response headers.
- Expired-token rejection, verified-header replacement and timeout mapping were additionally exercised by automated integration tests with controlled upstreams.
- Auth Service and Gateway processes used for manual verification were stopped cleanly afterward.

### User Service verification

- Baseline before Prompt 06 failed its only context test because no datasource driver/configuration could be resolved.
- Final `mvnw.cmd clean verify`: 15 tests passed, 0 failures, 0 errors and 0 skipped.
- PostgreSQL 17 Testcontainers verified Flyway V1 and repositories without using the development database.
- Tests cover profile ownership and role checks, Company OWNER transaction/policy, outsider and recruiter denial, duplicate membership, public response filtering, PDF extension/MIME/signature/size validation, safe object keys, cross-user CV deletion denial, internal contracts and upload cleanup after database failure.
- Manual Gateway flow passed Candidate register/login/profile update/CV upload/list/delete and Employer register/login/Company create/update.
- Manual unauthorized Company update returned 403, and `/internal/**` through Gateway returned 404.
- MinIO contained the `recruitment-cvs` bucket with private access; the manual CV metadata and object were removed after DELETE.
- Auth Service, User Service and Gateway processes used for manual verification were stopped cleanly afterward.

## In progress

- None for Prompt 06.

## Blocked

- None.

## Remaining security/operational limitations

- Development RSA keys are local-only examples. Deployments must inject their own key paths and must not use the development private key.
- Refresh Token storage remains PostgreSQL-backed for the MVP. Redis integration, rate limiting and token blacklist behavior belong to later prompts.
- Key rotation/JWKS and production secret management are not part of Prompt 04.
- Domain services other than Auth are not implemented/running yet, so their live end-to-end behavior cannot be exercised; Gateway integration tests use controlled HTTP upstreams.
- Rate limiting, retries, service discovery and circuit breaking are outside Prompt 05.
- Internal service authentication uses an environment-provided shared token plus private networking for the MVP. Production should use workload identity or mutual TLS with rotation.
- CV upload compensates a failed database write by best-effort object deletion. Delete removes the object before metadata; an idempotent retry completes cleanup if the database step fails.

## Next task

- Prompt 07 — Job Service, only when explicitly requested.
