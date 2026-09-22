create table candidate_profiles (
    id uuid primary key,
    user_id uuid not null,
    full_name varchar(150),
    phone varchar(30),
    headline varchar(255),
    summary text,
    location_id uuid,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    version bigint not null default 0,
    constraint uk_candidate_profiles_user_id unique (user_id)
);

create table companies (
    id uuid primary key,
    name varchar(255) not null,
    description text,
    address varchar(500),
    logo_object_key varchar(500),
    status varchar(30) not null default 'ACTIVE',
    created_at timestamptz not null,
    updated_at timestamptz not null,
    version bigint not null default 0
);

create table company_members (
    id uuid primary key,
    company_id uuid not null references companies(id) on delete cascade,
    user_id uuid not null,
    member_role varchar(30) not null,
    created_at timestamptz not null,
    constraint uk_company_members_company_user unique (company_id, user_id),
    constraint ck_company_members_role check (member_role in ('OWNER', 'RECRUITER'))
);

create table cvs (
    id uuid primary key,
    candidate_id uuid not null,
    file_name varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(100) not null,
    size_bytes bigint not null,
    is_default boolean not null default false,
    created_at timestamptz not null,
    constraint uk_cvs_object_key unique (object_key),
    constraint ck_cvs_size_positive check (size_bytes > 0)
);

create index idx_candidate_profiles_user_id on candidate_profiles(user_id);
create index idx_company_members_user_id on company_members(user_id);
create index idx_company_members_company_id on company_members(company_id);
create index idx_cvs_candidate_created on cvs(candidate_id, created_at desc);
