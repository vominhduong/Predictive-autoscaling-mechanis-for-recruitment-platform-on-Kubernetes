create table notifications(
 id uuid primary key,event_id uuid not null unique,recipient varchar(320) not null,channel varchar(20) not null,template_code varchar(100) not null,subject varchar(255) not null,status varchar(20) not null,attempt_count integer not null default 0,last_error varchar(1000),sent_at timestamptz,created_at timestamptz not null,updated_at timestamptz not null,version bigint not null default 0,
 constraint ck_notification_channel check(channel in ('EMAIL')),constraint ck_notification_status check(status in ('PENDING','SENT','FAILED')),constraint ck_notification_attempt check(attempt_count>=0));
create table processed_events(event_id uuid primary key,event_type varchar(100) not null,processed_at timestamptz not null);
create index idx_notifications_status_updated on notifications(status,updated_at);
create index idx_notifications_event on notifications(event_id);
