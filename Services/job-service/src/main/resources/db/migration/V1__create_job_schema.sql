create table job_categories(id uuid primary key,name varchar(120) not null,slug varchar(120) not null unique,active boolean not null default true,created_at timestamptz not null,updated_at timestamptz not null);
create table job_locations(id uuid primary key,name varchar(120) not null,slug varchar(120) not null unique,active boolean not null default true,created_at timestamptz not null,updated_at timestamptz not null);
create table jobs(
 id uuid primary key,company_id uuid not null,created_by uuid not null,title varchar(255) not null,description text not null,requirements text not null,
 location_id uuid not null references job_locations(id),category_id uuid not null references job_categories(id),employment_type varchar(30) not null,
 salary_min numeric(15,2),salary_max numeric(15,2),salary_currency varchar(3) not null,salary_negotiable boolean not null default false,status varchar(30) not null,
 application_deadline date not null,published_at timestamptz,created_at timestamptz not null,updated_at timestamptz not null,version bigint not null default 0,
 constraint ck_jobs_employment_type check(employment_type in('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','FREELANCE')),
 constraint ck_jobs_status check(status in('DRAFT','PUBLISHED','HIDDEN','CLOSED')),
 constraint ck_jobs_salary check((salary_min is null or salary_min>=0) and (salary_max is null or salary_max>=0) and (salary_min is null or salary_max is null or salary_max>=salary_min))
);
create index idx_jobs_status on jobs(status); create index idx_jobs_company on jobs(company_id); create index idx_jobs_category on jobs(category_id); create index idx_jobs_location on jobs(location_id); create index idx_jobs_created on jobs(created_at desc); create index idx_jobs_deadline on jobs(application_deadline); create index idx_jobs_title_lower on jobs(lower(title));
