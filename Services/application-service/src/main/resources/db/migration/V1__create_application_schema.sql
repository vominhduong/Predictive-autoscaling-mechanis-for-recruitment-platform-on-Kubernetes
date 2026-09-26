create table applications (
 id uuid primary key,
 job_id uuid not null,
 candidate_id uuid not null,
 employer_id uuid not null,
 company_id uuid not null,
 cv_id uuid not null,
 cv_object_key_snapshot varchar(500) not null,
 cv_file_name_snapshot varchar(255) not null,
 job_title_snapshot varchar(255) not null,
 candidate_identity_snapshot varchar(255) not null,
 cover_letter text,
 status varchar(30) not null,
 created_at timestamptz not null,
 updated_at timestamptz not null,
 version bigint not null default 0,
 constraint uk_applications_candidate_job unique(candidate_id, job_id),
 constraint ck_applications_status check(status in ('APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED'))
);
create table application_status_histories (
 id uuid primary key,
 application_id uuid not null references applications(id) on delete cascade,
 from_status varchar(30),
 to_status varchar(30) not null,
 changed_by uuid not null,
 note varchar(2000),
 created_at timestamptz not null
);
create index idx_applications_candidate_created on applications(candidate_id, created_at desc);
create index idx_applications_job_status on applications(job_id, status);
create index idx_applications_company_created on applications(company_id, created_at desc);
create index idx_application_history_application on application_status_histories(application_id, created_at);
