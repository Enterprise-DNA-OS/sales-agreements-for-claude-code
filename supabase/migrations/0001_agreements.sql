create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table accounts (
 id uuid primary key default gen_random_uuid(), source_id text unique not null, name text not null check(btrim(name)<>''),
 reviewed_on date, review_due date, retention_purpose text not null default '', source_row jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table products (
 id uuid primary key default gen_random_uuid(), source_id text unique not null, name text not null check(btrim(name)<>''),
 unit text not null default 'units', source_row jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table agreements (
 id uuid primary key default gen_random_uuid(), source_id text unique not null, name text not null check(btrim(name)<>''),
 account_id uuid not null references accounts(id), starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 currency text not null check(currency ~ '^[A-Z]{3}$'), status text not null check(status in ('Draft','Approved','Active','Expired','Cancelled')),
 owner text not null default '', evidence text not null default '', review_due date, source_row jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index agreements_account_idx on agreements(account_id);
create table lines (
 id uuid primary key default gen_random_uuid(), source_id text unique not null,
 agreement_id uuid not null references agreements(id), product_id uuid not null references products(id),
 source_row jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index lines_agreement_idx on lines(agreement_id);
create index lines_product_idx on lines(product_id);
create table schedules (
 id uuid primary key default gen_random_uuid(), source_id text unique not null, line_id uuid not null references lines(id),
 starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 planned numeric(18,3) not null check(planned>=0), actual numeric(18,3) not null default 0 check(actual>=0),
 price numeric(18,4) not null check(price>=0), actual_as_of date,
 source_row jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(line_id,starts_on,ends_on)
);
create index schedules_line_idx on schedules(line_id);
create index schedules_end_idx on schedules(ends_on);
create table followups (
 id uuid primary key default gen_random_uuid(), agreement_id uuid not null references agreements(id),
 name text not null check(btrim(name)<>''), owner text not null check(btrim(owner)<>''), due_on date not null,
 state text not null default 'open' check(state in ('open','done')), resolution text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index followups_agreement_idx on followups(agreement_id);
create table events (
 id uuid primary key default gen_random_uuid(), actor text not null, action text not null, details jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Serialise edits to a product line, preventing overlapping intervals on concurrent writes.
create function check_schedule() returns trigger language plpgsql as $$
declare a agreements; begin
 perform 1 from lines where id=new.line_id for update;
 select ag.* into a from agreements ag join lines l on l.agreement_id=ag.id where l.id=new.line_id;
 if new.starts_on<a.starts_on or new.ends_on>a.ends_on then raise exception 'Schedule is outside agreement term'; end if;
 if exists(select 1 from schedules s where s.line_id=new.line_id and s.id<>new.id and s.starts_on<=new.ends_on and s.ends_on>=new.starts_on) then raise exception 'Schedule intervals overlap'; end if;
 if new.actual_as_of>current_date then raise exception 'Actuals date cannot be in the future'; end if;
 return new; end $$;
create trigger schedule_checks before insert or update on schedules for each row execute function check_schedule();
create function check_agreement_term() returns trigger language plpgsql as $$ begin
 if exists(select 1 from schedules s join lines l on l.id=s.line_id where l.agreement_id=new.id and (s.starts_on<new.starts_on or s.ends_on>new.ends_on)) then raise exception 'Agreement term excludes existing schedules'; end if;
 return new; end $$;
create trigger agreement_term_checks before update on agreements for each row execute function check_agreement_term();
create function immutable_event() returns trigger language plpgsql as $$ begin raise exception 'Events are append-only'; end $$;
create trigger immutable_events before update or delete on events for each row execute function immutable_event();
do $$ declare n text; begin foreach n in array array['accounts','products','agreements','lines','schedules','followups'] loop
 execute format('create trigger updated_at before update on %I for each row execute function touch_updated_at()',n);
 end loop;
 foreach n in array array['accounts','products','agreements','lines','schedules','followups','events'] loop
 execute format('alter table %I enable row level security',n); execute format('revoke all on %I from public',n);
 end loop; end $$;
create view schedule_performance as
 select s.id,s.source_id,a.id agreement_id,a.name agreement,c.id account_id,c.name account,a.owner,a.status,a.currency,p.name product,p.unit,
 s.starts_on,s.ends_on,s.planned,s.actual,s.planned-s.actual gap,s.price,
 round(s.planned*s.price,2) planned_value,round(s.actual*s.price,2) actual_value,
 round(greatest(s.planned-s.actual,0)*s.price,2) gap_value,s.actual_as_of,
 case when s.actual_as_of is null then 'unverified' when s.actual_as_of<current_date-14 then 'stale' else 'current' end actuals_freshness
 from schedules s join lines l on l.id=s.line_id join agreements a on a.id=l.agreement_id
 join accounts c on c.id=a.account_id join products p on p.id=l.product_id;
create view delivery_gaps as select * from schedule_performance where status in ('Active','Approved') and ends_on<current_date and gap>0;
create view renewals_due as select a.id,a.name agreement,c.id account_id,c.name account,a.owner,a.currency,a.status,a.ends_on,a.ends_on-current_date days_left,a.evidence
 from agreements a join accounts c on c.id=a.account_id where a.status in ('Active','Approved') and a.ends_on<=current_date+60;
create view control_exceptions as
 select 'agreement-evidence' rule,id record_id,name record,'Missing agreement evidence' issue from agreements where status in ('Active','Approved') and evidence=''
 union all select 'agreement-review',id,name,'Agreement review missing or overdue' from agreements where status in ('Active','Approved') and (review_due is null or review_due<current_date)
 union all select 'record-accuracy',id,name,'Account accuracy review missing or overdue' from accounts where reviewed_on is null or review_due is null or review_due<current_date
 union all select 'record-retention',id,name,'Account retention purpose missing' from accounts where retention_purpose=''
 union all select 'actuals-evidence',id,source_id,'Actuals date missing or stale (business policy: 14 days)' from schedules where actual_as_of is null or actual_as_of<current_date-14
 union all select 'schedule-coverage',a.id,a.name,'Agreement has no scheduled products' from agreements a where a.status in ('Active','Approved') and not exists(select 1 from lines l join schedules s on s.line_id=l.id where l.agreement_id=a.id);
revoke all on schedule_performance,delivery_gaps,renewals_due,control_exceptions from public;

create function check_line_term() returns trigger language plpgsql as $$ begin
 perform 1 from agreements where id=new.agreement_id for update;
 if exists(select 1 from schedules s join agreements a on a.id=new.agreement_id where s.line_id=new.id and (s.starts_on<a.starts_on or s.ends_on>a.ends_on)) then raise exception 'Moved product line excludes existing schedules'; end if;
 return new; end $$;
create trigger line_term_checks before update on lines for each row execute function check_line_term();
