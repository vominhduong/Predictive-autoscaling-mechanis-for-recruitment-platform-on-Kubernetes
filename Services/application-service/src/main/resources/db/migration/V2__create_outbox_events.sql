create table outbox_events (
 id uuid primary key,
 aggregate_type varchar(100) not null,
 aggregate_id uuid not null,
 event_type varchar(100) not null,
 event_version integer not null,
 payload text not null,
 status varchar(20) not null,
 attempt_count integer not null default 0,
 created_at timestamptz not null,
 published_at timestamptz,
 next_attempt_at timestamptz not null,
 locked_at timestamptz,
 last_error varchar(1000),
 constraint ck_outbox_status check(status in ('PENDING','IN_PROGRESS','FAILED','PUBLISHED')),
 constraint ck_outbox_attempt check(attempt_count >= 0)
);
create index idx_outbox_publish on outbox_events(status, next_attempt_at, created_at);
create index idx_outbox_aggregate on outbox_events(aggregate_type, aggregate_id);
