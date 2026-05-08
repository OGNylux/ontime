-- OnTime Full Production Schema (v10)
-- -------------------------------------------------------------------------------
-- CHANGELOG (v10)
-- 1. Added ontime_workspace_billing table (invoice sender details: address, email, VAT)
-- 2. Added email, phone, vat_number columns to ontime_client_info
-- 3. Added ontime_invoice table (status, issue/due dates, currency, tax rate, pdf path)
-- 4. Added ontime_invoice_line_item table (immutable snapshot of hours+rate per entry)
-- 5. Added invoice_id FK on ontime_calendar_entry to prevent double-billing
-- 6. Added generate_invoice_number(workspace_id) RPC
-- 7. Added 7-day retention policy for soft-deleted records + pg_cron job to automate it
-- -------------------------------------------------------------------------------
-- CHANGELOG (v9)
-- 1. Added UI-facing columns the service layer depends on:
--      - ontime_client.pinned, ontime_project.pinned, ontime_task.pinned
--      - ontime_project.description, ontime_project.hourly_rate, ontime_project.start_date
-- 2. Added ontime_user.active_workspace_id so the UI can persist the selected
--    workspace on the server (FK to workspace, set null on workspace delete)
-- 3. handle_new_user now also provisions a default personal workspace +
--    owner membership and sets it as the new user's active workspace
-- 4. Added set_active_workspace RPC (validates membership before switching)
-- 5. v_hours_per_project and v_hours_per_task now group per-user too,
--    matching v_hours_per_day's granularity
-- -------------------------------------------------------------------------------
-- CHANGELOG (v8)
-- 1. Added missing is_workspace_member / has_workspace_role helper functions
--    (were referenced in RLS policies but never defined — schema would fail to run)
-- 2. Added handle_new_user trigger to auto-create ontime_user on signup
-- 3. Added check_user_exists RPC (called by authService but was missing)
-- 4. Added check_task_project_consistency trigger for calendar_entry and active_recording
--    (was referenced in v7 comments but not implemented)
-- 5. Added calendar_entry_id to ontime_active_recording (replaces localStorage hack)
-- 6. Added user_select_same_workspace RLS policy so workspace members can see each other
-- 7. Added create_workspace_invite and accept_workspace_invite RPCs
-- 8. Improved analytics views: added billable_hours, per-user grouping for v_hours_per_day
-- 9. Added performance indexes
-- -------------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- =========================
-- HELPER FUNCTIONS
-- Must be defined before any table that references them in RLS policies.
-- security definer so they bypass RLS on ontime_workspace_member,
-- preventing infinite recursion when that table's own RLS calls them.
-- =========================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
    return exists (
        select 1 from public.ontime_workspace_member
        where workspace_id = p_workspace_id
          and user_id = auth.uid()
    );
end;
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
    return exists (
        select 1 from public.ontime_workspace_member
        where workspace_id = p_workspace_id
          and user_id = auth.uid()
          and role = any(p_roles)
    );
end;
$$;

-- =========================
-- USERS
-- =========================
create table if not exists public.ontime_user (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    timezone text,
    active_workspace_id uuid,
    created_at timestamptz not null default now(),
    constraint non_empty_user_name check (length(trim(name)) > 0)
);

alter table public.ontime_user enable row level security;

create policy "user_select_own"
on public.ontime_user for select
using (auth.uid() = id);

create policy "user_update_own"
on public.ontime_user for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Auto-create ontime_user profile + a personal workspace on auth signup.
-- The new user becomes 'owner' of their default workspace and it is set
-- as their active_workspace_id so the app has a workspace to operate in
-- immediately after login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text;
    v_workspace_id uuid;
begin
    v_name := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(new.email, '@', 1)
    );

    insert into public.ontime_user (id, name, timezone)
    values (new.id, v_name, new.raw_user_meta_data ->> 'timezone')
    on conflict (id) do nothing;

    insert into public.ontime_workspace (name, created_by)
    values (v_name || '''s workspace', new.id)
    returning id into v_workspace_id;

    -- trg_workspace_owner_member fires on the insert above and creates the
    -- owner membership row automatically; no explicit insert needed here.

    update public.ontime_user
    set active_workspace_id = v_workspace_id
    where id = new.id;

    return new;
end;
$$;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =========================
-- WORKSPACES
-- =========================
create table public.ontime_workspace (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint non_empty_workspace_name check (length(trim(name)) > 0)
);

alter table public.ontime_workspace enable row level security;

-- workspace_select and workspace_update_admin are added after ontime_workspace_member
-- is created (they reference that table directly in their predicate).

-- Members can create new workspaces; the creator becomes a member via the
-- bootstrap trigger below. We don't restrict insert beyond auth.uid() match.
create policy "workspace_insert_authenticated"
on public.ontime_workspace for insert
with check (auth.uid() = created_by);

-- Auto-add the creator as 'owner' when a workspace is inserted.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.ontime_workspace_member (user_id, workspace_id, role)
    values (new.created_by, new.id, 'owner')
    on conflict (user_id, workspace_id) do nothing;
    return new;
end;
$$;

create or replace trigger trg_workspace_owner_member
    after insert on public.ontime_workspace
    for each row execute function public.handle_new_workspace();

-- Backfill the FK that ontime_user.active_workspace_id was created without
-- (the workspace table didn't exist yet at that point in the schema).
do $$
begin
    if not exists (
        select 1 from information_schema.table_constraints
        where constraint_name = 'ontime_user_active_workspace_fk'
    ) then
        alter table public.ontime_user
            add constraint ontime_user_active_workspace_fk
            foreign key (active_workspace_id)
            references public.ontime_workspace(id)
            on delete set null;
    end if;
end $$;

-- =========================
-- WORKSPACE MEMBERS
-- =========================
create table public.ontime_workspace_member (
    user_id uuid not null references public.ontime_user(id) on delete cascade,
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    role text not null default 'owner',
    created_at timestamptz not null default now(),
    primary key (user_id, workspace_id),
    constraint valid_role check (role in ('owner','admin','member'))
);

alter table public.ontime_workspace_member enable row level security;

create policy "workspace_member_select"
on public.ontime_workspace_member for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_member_insert_admin"
on public.ontime_workspace_member for insert
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "workspace_member_update_admin"
on public.ontime_workspace_member for update
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "workspace_member_delete_admin"
on public.ontime_workspace_member for delete
using (public.has_workspace_role(workspace_id, array['owner','admin']));

-- Policies deferred until ontime_workspace_member exists (inline subqueries).
create policy "user_select_same_workspace"
on public.ontime_user for select
using (
    id in (
        select m.user_id from public.ontime_workspace_member m
        where m.workspace_id in (
            select m2.workspace_id from public.ontime_workspace_member m2
            where m2.user_id = auth.uid()
        )
    )
);

create policy "workspace_select"
on public.ontime_workspace for select
using (
    exists (
        select 1 from public.ontime_workspace_member m
        where m.workspace_id = id and m.user_id = auth.uid()
    )
);

create policy "workspace_update_admin"
on public.ontime_workspace for update
using (public.has_workspace_role(id, array['owner','admin']))
with check (public.has_workspace_role(id, array['owner','admin']));

-- =========================
-- CLIENT INFO
-- =========================
create table public.ontime_client_info (
    id uuid primary key default gen_random_uuid(),
    street text,
    house_number text,
    postal_code text,
    city text,
    state text,
    country text,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.ontime_client_info enable row level security;

create policy "client_info_select"
on public.ontime_client_info for select
using (
    auth.uid() = created_by
    or exists (
        select 1 from public.ontime_client c
        where c.info_id = id
          and public.is_workspace_member(c.workspace_id)
    )
);

create policy "client_info_insert"
on public.ontime_client_info for insert
with check (auth.uid() = created_by);

create policy "client_info_update"
on public.ontime_client_info for update
using (
    auth.uid() = created_by
    or exists (
        select 1 from public.ontime_client c
        where c.info_id = id
          and public.is_workspace_member(c.workspace_id)
    )
);

create policy "client_info_delete"
on public.ontime_client_info for delete
using (
    auth.uid() = created_by
    or exists (
        select 1 from public.ontime_client c
        where c.info_id = id
          and public.is_workspace_member(c.workspace_id)
    )
);

-- =========================
-- CLIENT
-- =========================
create table public.ontime_client (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    name text not null,
    info_id uuid unique references public.ontime_client_info(id) on delete set null,
    pinned boolean not null default false,
    created_by uuid not null references auth.users(id),
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    constraint non_empty_client_name check (length(trim(name)) > 0)
);

alter table public.ontime_client enable row level security;

create policy "client_select_active"
on public.ontime_client for select
using (public.is_workspace_member(workspace_id));

create policy "client_insert_member"
on public.ontime_client for insert
with check (public.is_workspace_member(workspace_id));

create policy "client_update_member"
on public.ontime_client for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "client_delete_member"
on public.ontime_client for delete
using (public.is_workspace_member(workspace_id));

-- =========================
-- PROJECT
-- =========================
create table public.ontime_project (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    client_id uuid references public.ontime_client(id) on delete set null,
    name text not null,
    description text,
    color integer,
    hourly_rate numeric(10, 2),
    start_date date,
    pinned boolean not null default false,
    created_by uuid not null references auth.users(id),
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    constraint valid_color check (color between 0 and 17),
    constraint non_empty_project_name check (length(trim(name)) > 0),
    constraint valid_hourly_rate check (hourly_rate is null or hourly_rate >= 0)
);

alter table public.ontime_project enable row level security;

create policy "project_select_active"
on public.ontime_project for select
using (public.is_workspace_member(workspace_id));

create policy "project_insert_member"
on public.ontime_project for insert
with check (public.is_workspace_member(workspace_id));

create policy "project_update_member"
on public.ontime_project for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "project_delete_member"
on public.ontime_project for delete
using (public.is_workspace_member(workspace_id));

-- =========================
-- TASK
-- =========================
create table public.ontime_task (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    project_id uuid references public.ontime_project(id) on delete set null,
    name text not null,
    color integer,
    pinned boolean not null default false,
    created_by uuid not null references auth.users(id),
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    constraint valid_color check (color between 0 and 17),
    constraint non_empty_task_name check (length(trim(name)) > 0)
);

alter table public.ontime_task enable row level security;

create policy "task_select_active"
on public.ontime_task for select
using (public.is_workspace_member(workspace_id));

create policy "task_insert_member"
on public.ontime_task for insert
with check (public.is_workspace_member(workspace_id));

create policy "task_update_member"
on public.ontime_task for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "task_delete_member"
on public.ontime_task for delete
using (public.is_workspace_member(workspace_id));

-- =========================
-- CALENDAR ENTRY
-- =========================
create table public.ontime_calendar_entry (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    created_by uuid not null references auth.users(id),
    task_id uuid references public.ontime_task(id),
    start_time timestamptz not null,
    end_time timestamptz not null,
    is_billable boolean not null default false,
    created_at timestamptz not null default now(),
    constraint valid_time check (end_time > start_time)
);

alter table public.ontime_calendar_entry enable row level security;

create policy "calendar_all"
on public.ontime_calendar_entry for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));


-- =========================
-- ACTIVE RECORDING
-- =========================
create table public.ontime_active_recording (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    created_by uuid not null references auth.users(id),
    task_id uuid references public.ontime_task(id),
    calendar_entry_id uuid references public.ontime_calendar_entry(id) on delete set null,
    title text,
    is_billable boolean not null default false,
    started_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint one_active_per_user_workspace unique (created_by, workspace_id)
);

alter table public.ontime_active_recording enable row level security;

create policy "recording_all"
on public.ontime_active_recording for all
using (created_by = auth.uid() and public.is_workspace_member(workspace_id))
with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));


-- =========================
-- INVITES
-- =========================
create table public.ontime_workspace_invite (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.ontime_workspace(id) on delete cascade,
    email text not null,
    role text not null default 'member',
    token text not null unique,
    invited_by uuid not null references auth.users(id),
    accepted_at timestamptz,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    constraint valid_role check (role in ('admin','member'))
);

alter table public.ontime_workspace_invite enable row level security;

create policy "invite_select"
on public.ontime_workspace_invite for select
using (public.is_workspace_member(workspace_id));

create policy "invite_insert"
on public.ontime_workspace_invite for insert
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "invite_delete"
on public.ontime_workspace_invite for delete
using (public.has_workspace_role(workspace_id, array['owner','admin']));

-- =========================
-- RPCs
-- =========================

-- Check email availability during registration
create or replace function public.check_user_exists(email_input text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email_exists boolean;
begin
    select exists(select 1 from auth.users where email = email_input) into v_email_exists;
    return json_build_object('emailExists', v_email_exists);
end;
$$;

-- Create a workspace invite and return the token
create or replace function public.create_workspace_invite(
    p_workspace_id uuid,
    p_email text,
    p_role text default 'member',
    p_ttl_hours int default 72
)
returns text
language plpgsql
security invoker
as $$
declare
    v_token text;
begin
    if not public.has_workspace_role(p_workspace_id, array['owner', 'admin']) then
        raise exception 'Insufficient permissions to invite members';
    end if;

    v_token := encode(gen_random_bytes(32), 'hex');

    insert into public.ontime_workspace_invite (
        workspace_id, email, role, token, invited_by, expires_at
    ) values (
        p_workspace_id,
        lower(trim(p_email)),
        p_role,
        v_token,
        auth.uid(),
        now() + (p_ttl_hours || ' hours')::interval
    );

    return v_token;
end;
$$;

-- Switch the caller's active workspace (validates membership first)
create or replace function public.set_active_workspace(p_workspace_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
    if not public.is_workspace_member(p_workspace_id) then
        raise exception 'Not a member of the requested workspace';
    end if;

    update public.ontime_user
    set active_workspace_id = p_workspace_id
    where id = auth.uid();
end;
$$;

-- Accept a workspace invite by token (validates email match, adds member atomically)
create or replace function public.accept_workspace_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_invite public.ontime_workspace_invite;
    v_user_email text;
begin
    select * into v_invite
    from public.ontime_workspace_invite
    where token = p_token
      and accepted_at is null
      and expires_at > now();

    if not found then
        raise exception 'Invite is invalid or has expired';
    end if;

    select email into v_user_email from auth.users where id = auth.uid();

    if lower(trim(v_user_email)) != v_invite.email then
        raise exception 'This invite was sent to a different email address';
    end if;

    insert into public.ontime_workspace_member (user_id, workspace_id, role)
    values (auth.uid(), v_invite.workspace_id, v_invite.role)
    on conflict (user_id, workspace_id) do update set role = excluded.role;

    update public.ontime_workspace_invite
    set accepted_at = now()
    where id = v_invite.id;
end;
$$;

-- Return overview-ready aggregates scoped to one workspace and date range.
create or replace function public.get_overview_aggregates(
    p_workspace_id uuid,
    p_start timestamptz,
    p_end timestamptz,
    p_client_ids uuid[] default null,
    p_project_ids uuid[] default null
)
returns table (
    day date,
    client_id uuid,
    project_id uuid,
    project_name text,
    project_color integer,
    task_id uuid,
    task_name text,
    total_minutes numeric,
    billable_minutes numeric,
    revenue numeric
)
language sql
security invoker
stable
as $$
    select
        date_trunc('day', ce.start_time)::date as day,
        p.client_id,
        t.project_id,
        p.name as project_name,
        p.color as project_color,
        ce.task_id,
        t.name as task_name,
        sum(extract(epoch from (ce.end_time - ce.start_time)) / 60.0) as total_minutes,
        sum(
            case
                when ce.is_billable then extract(epoch from (ce.end_time - ce.start_time)) / 60.0
                else 0
            end
        ) as billable_minutes,
        sum(
            case
                when ce.is_billable then (extract(epoch from (ce.end_time - ce.start_time)) / 3600.0) * coalesce(p.hourly_rate, 0)
                else 0
            end
        ) as revenue
    from public.ontime_calendar_entry ce
    left join public.ontime_task t on t.id = ce.task_id
    left join public.ontime_project p on p.id = t.project_id
    where ce.workspace_id = p_workspace_id
      and public.is_workspace_member(p_workspace_id)
      and ce.start_time >= p_start
      and ce.start_time <= p_end
      and (p.id is null or p.deleted_at is null)
      and (t.id is null or t.deleted_at is null)
      and (p_client_ids is null or p.client_id = any(p_client_ids))
      and (p_project_ids is null or t.project_id = any(p_project_ids))
    group by
        date_trunc('day', ce.start_time)::date,
        p.client_id,
        t.project_id,
        p.name,
        p.color,
        ce.task_id,
        t.name
    order by day asc;
$$;

-- =========================
-- ANALYTICS VIEWS
-- Added billable_hours alongside total_hours.
-- v_hours_per_day now groups by created_by so each user's time is tracked separately.
-- =========================

create or replace view public.v_hours_per_project with (security_invoker = true) as
select
    ce.workspace_id,
    ce.created_by,
    t.project_id,
    sum(extract(epoch from (ce.end_time - ce.start_time))) / 3600 as total_hours,
    sum(case when ce.is_billable then extract(epoch from (ce.end_time - ce.start_time)) else 0 end) / 3600 as billable_hours
from public.ontime_calendar_entry ce
join public.ontime_task t on t.id = ce.task_id
group by ce.workspace_id, ce.created_by, t.project_id;

create or replace view public.v_hours_per_task with (security_invoker = true) as
select
    ce.workspace_id,
    ce.created_by,
    t.project_id,
    ce.task_id,
    sum(extract(epoch from (ce.end_time - ce.start_time))) / 3600 as total_hours,
    sum(case when ce.is_billable then extract(epoch from (ce.end_time - ce.start_time)) else 0 end) / 3600 as billable_hours
from public.ontime_calendar_entry ce
join public.ontime_task t on t.id = ce.task_id
group by ce.workspace_id, ce.created_by, t.project_id, ce.task_id;

create or replace view public.v_hours_per_client with (security_invoker = true) as
select
    ce.workspace_id,
    c.id as client_id,
    sum(extract(epoch from (ce.end_time - ce.start_time))) / 3600 as total_hours,
    sum(case when ce.is_billable then extract(epoch from (ce.end_time - ce.start_time)) else 0 end) / 3600 as billable_hours
from public.ontime_calendar_entry ce
join public.ontime_task t on t.id = ce.task_id
join public.ontime_project p on p.id = t.project_id
join public.ontime_client c on c.id = p.client_id
group by ce.workspace_id, c.id;

create or replace view public.v_hours_per_day with (security_invoker = true) as
select
    workspace_id,
    created_by,
    date_trunc('day', start_time) as day,
    sum(extract(epoch from (end_time - start_time))) / 3600 as total_hours,
    sum(case when is_billable then extract(epoch from (end_time - start_time)) else 0 end) / 3600 as billable_hours
from public.ontime_calendar_entry
group by workspace_id, created_by, day;

create or replace view public.v_hours_per_user with (security_invoker = true) as
select
    workspace_id,
    created_by,
    sum(extract(epoch from (end_time - start_time))) / 3600 as total_hours,
    sum(case when is_billable then extract(epoch from (end_time - start_time)) else 0 end) / 3600 as billable_hours
from public.ontime_calendar_entry
group by workspace_id, created_by;

create or replace view public.v_billable_summary with (security_invoker = true) as
select
    workspace_id,
    is_billable,
    sum(extract(epoch from (end_time - start_time))) / 3600 as total_hours
from public.ontime_calendar_entry
group by workspace_id, is_billable;

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_calendar_workspace_time
    on public.ontime_calendar_entry (workspace_id, start_time);

create index if not exists idx_calendar_created_by_time
    on public.ontime_calendar_entry (created_by, start_time);

create index if not exists idx_task_project_id
    on public.ontime_task (project_id);

create index if not exists idx_task_workspace_id
    on public.ontime_task (workspace_id);

create index if not exists idx_project_workspace_id
    on public.ontime_project (workspace_id);

create index if not exists idx_workspace_member_user_id
    on public.ontime_workspace_member (user_id);

create index if not exists idx_client_workspace_active
    on public.ontime_client (workspace_id) where deleted_at is null;

create index if not exists idx_project_client_id
    on public.ontime_project (client_id) where deleted_at is null;

create index if not exists idx_invite_token
    on public.ontime_workspace_invite (token) where accepted_at is null;

-- Indexes for calendar_entry joins used in analytics views and get_overview_aggregates
create index if not exists idx_calendar_project_id
    on public.ontime_calendar_entry (project_id);

create index if not exists idx_calendar_task_id
    on public.ontime_calendar_entry (task_id) where task_id is not null;

-- =========================
-- SOFT-DELETE RETENTION
-- Permanently removes rows that were soft-deleted more than 7 days ago.
-- =========================
create or replace function public.purge_soft_deleted_records(
    p_older_than interval default interval '7 days'
)
returns table(entity text, deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cutoff timestamptz := now() - p_older_than;
begin
    delete from public.ontime_task
    where deleted_at is not null
      and deleted_at <= v_cutoff;
    get diagnostics deleted_count = row_count;
    entity := 'ontime_task';
    return next;

    delete from public.ontime_project
    where deleted_at is not null
      and deleted_at <= v_cutoff;
    get diagnostics deleted_count = row_count;
    entity := 'ontime_project';
    return next;

    delete from public.ontime_client
    where deleted_at is not null
      and deleted_at <= v_cutoff;
    get diagnostics deleted_count = row_count;
    entity := 'ontime_client';
    return next;
end;
$$;

-- Schedule a daily cleanup at 03:00 UTC when pg_cron is available.
do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        if not exists (
            select 1
            from cron.job
            where jobname = 'purge-soft-deleted-records-daily'
        ) then
            perform cron.schedule(
                'purge-soft-deleted-records-daily',
                '0 3 * * *',
                $cron$select public.purge_soft_deleted_records();$cron$
            );
        end if;
    end if;
end;
$$;

-- =========================
-- WORKSPACE BILLING INFO (v10)
-- Stores the invoice sender's details (company address, VAT, contact).
-- One row per workspace, optional — workspace can exist without it.
-- =========================
create table if not exists public.ontime_workspace_billing (
    id            uuid primary key default gen_random_uuid(),
    workspace_id  uuid not null unique references public.ontime_workspace(id) on delete cascade,
    company_name  text,
    email         text,
    phone         text,
    vat_number    text,
    street        text,
    house_number  text,
    postal_code   text,
    city          text,
    state         text,
    country       text,
    bank_name     text,
    account_holder text,
    iban          text,
    swift         text,
    created_at    timestamptz not null default now()
);

alter table public.ontime_workspace_billing enable row level security;

create policy "workspace_billing_select"
on public.ontime_workspace_billing for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_billing_insert_admin"
on public.ontime_workspace_billing for insert
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "workspace_billing_update_admin"
on public.ontime_workspace_billing for update
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

-- =========================
-- CLIENT INFO ADDITIONS (v10)
-- =========================
alter table public.ontime_client_info
    add column if not exists email      text,
    add column if not exists phone      text,
    add column if not exists vat_number text;

-- =========================
-- INVOICE (v10)
-- =========================
create table if not exists public.ontime_invoice (
    id               uuid primary key default gen_random_uuid(),
    workspace_id     uuid not null references public.ontime_workspace(id) on delete cascade,
    client_id        uuid references public.ontime_client(id) on delete set null,
    invoice_number   text not null,
    status           text not null default 'draft',
    issue_date       date not null default current_date,
    due_date         date,
    currency         text not null default 'EUR',
    tax_rate         numeric(5,2) not null default 0,
    notes            text,
    -- Populated after PDF generation; path within Supabase Storage bucket.
    pdf_storage_path text,
    created_by       uuid not null references auth.users(id),
    created_at       timestamptz not null default now(),
    sent_at          timestamptz,
    paid_at          timestamptz,
    constraint valid_invoice_status check (status in ('draft','sent','paid','overdue','cancelled')),
    constraint valid_tax_rate       check (tax_rate >= 0 and tax_rate <= 100),
    constraint unique_invoice_number unique (workspace_id, invoice_number)
);

alter table public.ontime_invoice enable row level security;

create policy "invoice_select"
on public.ontime_invoice for select
using (public.is_workspace_member(workspace_id));

create policy "invoice_insert_admin"
on public.ontime_invoice for insert
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "invoice_update_admin"
on public.ontime_invoice for update
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "invoice_delete_admin"
on public.ontime_invoice for delete
using (public.has_workspace_role(workspace_id, array['owner','admin']));

-- =========================
-- INVOICE LINE ITEMS (v10)
-- Snapshot of hours + rate at invoice creation time so that later changes
-- to project.hourly_rate never silently alter historical invoices.
-- =========================
create table if not exists public.ontime_invoice_line_item (
    id                uuid primary key default gen_random_uuid(),
    invoice_id        uuid not null references public.ontime_invoice(id) on delete cascade,
    -- Nullable: line items can be manually added without a linked time entry.
    calendar_entry_id uuid references public.ontime_calendar_entry(id) on delete set null,
    project_name      text,
    description       text not null,
    date              date not null,
    quantity_hours    numeric(8,2) not null,
    unit_price        numeric(10,2) not null,
    -- Stored so queries never need to recompute and the value survives rate changes.
    amount            numeric(10,2) not null generated always as (quantity_hours * unit_price) stored,
    created_at        timestamptz not null default now(),
    constraint valid_quantity   check (quantity_hours > 0),
    constraint valid_unit_price check (unit_price >= 0)
);

alter table public.ontime_invoice_line_item enable row level security;

-- Access is derived from the parent invoice's workspace.
create policy "invoice_line_item_select"
on public.ontime_invoice_line_item for select
using (
    exists (
        select 1 from public.ontime_invoice i
        where i.id = invoice_id
          and public.is_workspace_member(i.workspace_id)
    )
);

create policy "invoice_line_item_insert_admin"
on public.ontime_invoice_line_item for insert
with check (
    exists (
        select 1 from public.ontime_invoice i
        where i.id = invoice_id
          and public.has_workspace_role(i.workspace_id, array['owner','admin'])
    )
);

create policy "invoice_line_item_delete_admin"
on public.ontime_invoice_line_item for delete
using (
    exists (
        select 1 from public.ontime_invoice i
        where i.id = invoice_id
          and public.has_workspace_role(i.workspace_id, array['owner','admin'])
    )
);

-- =========================
-- LINK CALENDAR ENTRIES TO INVOICES (v10)
-- Prevents the same time entry from appearing on two invoices.
-- =========================
alter table public.ontime_calendar_entry
    add column if not exists invoice_id uuid references public.ontime_invoice(id) on delete set null;

create index if not exists idx_calendar_invoice_id
    on public.ontime_calendar_entry (invoice_id) where invoice_id is not null;

-- =========================
-- INVOICE NUMBER GENERATOR (v10)
-- Returns the next sequential number for a workspace in YYYY-NNN format.
-- Uses a FOR UPDATE lock on the invoice table to be safe under concurrency.
-- =========================
create or replace function public.generate_invoice_number(p_workspace_id uuid)
returns text
language plpgsql
security invoker
as $$
declare
    v_year  text;
    v_count int;
begin
    if not public.has_workspace_role(p_workspace_id, array['owner','admin']) then
        raise exception 'Insufficient permissions';
    end if;

    v_year := to_char(current_date, 'YYYY');

    select count(*) + 1 into v_count
    from public.ontime_invoice
    where workspace_id = p_workspace_id
      and to_char(created_at, 'YYYY') = v_year;

    return v_year || '-' || lpad(v_count::text, 3, '0');
end;
$$;

-- =========================
-- INVOICE INDEXES (v10)
-- =========================
create index if not exists idx_invoice_workspace_id
    on public.ontime_invoice (workspace_id);

create index if not exists idx_invoice_client_id
    on public.ontime_invoice (client_id) where client_id is not null;

create index if not exists idx_invoice_status
    on public.ontime_invoice (workspace_id, status);

create index if not exists idx_invoice_line_item_invoice_id
    on public.ontime_invoice_line_item (invoice_id);

-- =========================
-- NOTIFICATIONS (v11)
-- Per-user notification feed. Rows are inserted via security-definer triggers;
-- users can only read/update/delete their own rows.
-- =========================
create table if not exists public.ontime_notification (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.ontime_user(id) on delete cascade,
    workspace_id uuid references public.ontime_workspace(id) on delete cascade,
    type         text not null,
    title        text not null,
    body         text not null,
    read         boolean not null default false,
    ref_id       uuid,
    metadata     jsonb,
    created_at   timestamptz not null default now(),
    constraint valid_notification_type check (
        type in ('workspace_invite', 'workspace_removed', 'entry_updated', 'entry_deleted')
    )
);

alter table public.ontime_notification enable row level security;

create policy "notification_select_own"
on public.ontime_notification for select
using (auth.uid() = user_id);

create policy "notification_update_own"
on public.ontime_notification for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notification_delete_own"
on public.ontime_notification for delete
using (auth.uid() = user_id);

create index if not exists idx_notification_user_created
    on public.ontime_notification (user_id, created_at desc);

-- Trigger: workspace invite created → notify the invited user (if they have an account)
create or replace function public.handle_workspace_invite_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id        uuid;
    v_workspace_name text;
    v_inviter_name   text;
begin
    select id into v_user_id from auth.users where lower(email) = new.email limit 1;
    if v_user_id is null then return new; end if;

    if exists (
        select 1 from public.ontime_workspace_member
        where workspace_id = new.workspace_id and user_id = v_user_id
    ) then return new; end if;

    select name into v_workspace_name from public.ontime_workspace where id = new.workspace_id;
    select name into v_inviter_name   from public.ontime_user         where id = new.invited_by;

    insert into public.ontime_notification (user_id, workspace_id, type, title, body, ref_id, metadata)
    values (
        v_user_id,
        new.workspace_id,
        'workspace_invite',
        'Workspace invitation',
        coalesce(v_inviter_name, 'Someone') || ' invited you to join "' || coalesce(v_workspace_name, 'a workspace') || '"',
        new.id,
        jsonb_build_object(
            'token',           new.token,
            'workspace_name',  coalesce(v_workspace_name, ''),
            'invited_by_name', coalesce(v_inviter_name, ''),
            'role',            new.role
        )
    );
    return new;
end;
$$;

create or replace trigger trg_workspace_invite_notification
    after insert on public.ontime_workspace_invite
    for each row execute function public.handle_workspace_invite_notification();

-- Trigger: workspace member deleted → notify the removed user (not when they leave voluntarily)
create or replace function public.handle_workspace_member_removal_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_workspace_name text;
begin
    if old.user_id = auth.uid() then return old; end if;

    select name into v_workspace_name from public.ontime_workspace where id = old.workspace_id;

    insert into public.ontime_notification (user_id, workspace_id, type, title, body, ref_id, metadata)
    values (
        old.user_id,
        old.workspace_id,
        'workspace_removed',
        'Removed from workspace',
        'You have been removed from "' || coalesce(v_workspace_name, 'a workspace') || '"',
        old.workspace_id,
        jsonb_build_object('workspace_name', coalesce(v_workspace_name, ''))
    );
    return old;
end;
$$;

create or replace trigger trg_workspace_member_removal_notification
    after delete on public.ontime_workspace_member
    for each row execute function public.handle_workspace_member_removal_notification();

-- Trigger: calendar entry updated/deleted by a different user → notify the entry owner
create or replace function public.handle_calendar_entry_change_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_modifier_id   uuid;
    v_modifier_name text;
    v_task_name     text;
    v_entry_date    text;
    v_owner_id      uuid;
    v_workspace_id  uuid;
    v_entry_id      uuid;
begin
    v_modifier_id := auth.uid();

    if TG_OP = 'DELETE' then
        if old.created_by = v_modifier_id or v_modifier_id is null then return old; end if;
        v_owner_id     := old.created_by;
        v_workspace_id := old.workspace_id;
        v_entry_id     := old.id;
        v_entry_date   := to_char(old.start_time at time zone 'UTC', 'Mon DD, YYYY');
        select name into v_modifier_name from public.ontime_user where id = v_modifier_id;
        if old.task_id is not null then
            select name into v_task_name from public.ontime_task where id = old.task_id;
        end if;

        insert into public.ontime_notification (user_id, workspace_id, type, title, body, ref_id, metadata)
        values (
            v_owner_id, v_workspace_id, 'entry_deleted', 'Time entry deleted',
            coalesce(v_modifier_name, 'A team member') || ' deleted your entry'
                || case when v_task_name is not null then ' "' || v_task_name || '"' else '' end
                || ' on ' || v_entry_date,
            v_entry_id,
            jsonb_build_object('modifier_name', coalesce(v_modifier_name,''), 'task_name', coalesce(v_task_name,''), 'entry_date', v_entry_date)
        );
        return old;
    end if;

    -- UPDATE
    if new.created_by = v_modifier_id or v_modifier_id is null then return new; end if;
    v_owner_id     := new.created_by;
    v_workspace_id := new.workspace_id;
    v_entry_id     := new.id;
    v_entry_date   := to_char(new.start_time at time zone 'UTC', 'Mon DD, YYYY');
    select name into v_modifier_name from public.ontime_user where id = v_modifier_id;
    if new.task_id is not null then
        select name into v_task_name from public.ontime_task where id = new.task_id;
    end if;

    insert into public.ontime_notification (user_id, workspace_id, type, title, body, ref_id, metadata)
    values (
        v_owner_id, v_workspace_id, 'entry_updated', 'Time entry modified',
        coalesce(v_modifier_name, 'A team member') || ' modified your entry'
            || case when v_task_name is not null then ' "' || v_task_name || '"' else '' end
            || ' on ' || v_entry_date,
        v_entry_id,
        jsonb_build_object('modifier_name', coalesce(v_modifier_name,''), 'task_name', coalesce(v_task_name,''), 'entry_date', v_entry_date)
    );
    return new;
end;
$$;

create or replace trigger trg_calendar_entry_change_notification
    after update or delete on public.ontime_calendar_entry
    for each row execute function public.handle_calendar_entry_change_notification();

-- =========================
-- REALTIME PUBLICATION
-- Both tables must be in supabase_realtime for postgres_changes to deliver events.
-- supabase_realtime is created by Supabase automatically; we just add our tables.
-- =========================
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'ontime_calendar_entry'
    ) then
        alter publication supabase_realtime add table public.ontime_calendar_entry;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'ontime_notification'
    ) then
        alter publication supabase_realtime add table public.ontime_notification;
    end if;
end $$;
