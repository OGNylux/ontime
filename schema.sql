-- =============================================================================
-- OnTime – full database schema
-- Run this in the Supabase SQL editor on a fresh project.
-- Supabase provides auth.users automatically; all other tables are below.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ontime_user
--    Mirror of auth.users with app-specific profile fields.
--    A trigger populates this automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_user (
    id          uuid        primary key references auth.users(id) on delete cascade,
    name        text        not null,
    email       text        not null,
    timezone    text,
    created_at  timestamptz not null default now()
);

alter table public.ontime_user enable row level security;

create policy "Users can view own profile"
    on public.ontime_user for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.ontime_user for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Trigger: auto-create ontime_user row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.ontime_user (id, name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- RPC used by authService to check email/name availability before registration
create or replace function public.check_user_exists(
    email_input text,
    name_input  text
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
    email_exists boolean;
    name_exists  boolean;
begin
    select exists(select 1 from public.ontime_user where email = email_input) into email_exists;
    select exists(select 1 from public.ontime_user where name  = name_input)  into name_exists;
    return json_build_object('emailExists', email_exists, 'nameExists', name_exists);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. ontime_client_info
--    Optional address / location details for a client.
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_client_info (
    id          uuid        primary key default gen_random_uuid(),
    address     text,
    postal_code text,
    city        text,
    state       text,
    country     text,
    created_by  uuid        not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now()
);

alter table public.ontime_client_info enable row level security;

create policy "Users manage own client info"
    on public.ontime_client_info for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- 3. ontime_client
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_client (
    id          uuid        primary key default gen_random_uuid(),
    name        text        not null,
    info_id     uuid        references public.ontime_client_info(id) on delete set null,
    pinned      boolean     not null default false,
    created_by  uuid        not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now()
);

alter table public.ontime_client enable row level security;

create policy "Users manage own clients"
    on public.ontime_client for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- 4. ontime_project
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_project (
    id           uuid        primary key default gen_random_uuid(),
    client_id    uuid        not null references public.ontime_client(id) on delete cascade,
    name         text        not null,
    description  text,
    color        integer,
    hourly_rate  numeric(10, 2),
    start_date   date,
    pinned       boolean     not null default false,
    created_by   uuid        not null references auth.users(id) on delete cascade,
    created_at   timestamptz not null default now()
);

alter table public.ontime_project enable row level security;

create policy "Users manage own projects"
    on public.ontime_project for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- 5. ontime_task
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_task (
    id          uuid        primary key default gen_random_uuid(),
    project_id  uuid        references public.ontime_project(id) on delete set null,
    name        text        not null,
    color       integer,
    pinned      boolean     not null default false,
    created_by  uuid        not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now()
);

alter table public.ontime_task enable row level security;

create policy "Users manage own tasks"
    on public.ontime_task for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- 6. ontime_calendar_entry
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_calendar_entry (
    id          uuid        primary key default gen_random_uuid(),
    user_id     uuid        not null references auth.users(id) on delete cascade,
    project_id  uuid        references public.ontime_project(id) on delete set null,
    task_id     uuid        references public.ontime_task(id) on delete set null,
    start_time  timestamptz not null,
    end_time    timestamptz not null,
    is_billable boolean     not null default false,
    created_at  timestamptz not null default now()
);

alter table public.ontime_calendar_entry enable row level security;

create policy "Users manage own calendar entries"
    on public.ontime_calendar_entry for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Index for the date-range queries used by calendarService.getEntries
create index if not exists ontime_calendar_entry_start_time_idx
    on public.ontime_calendar_entry (user_id, start_time);

-- ---------------------------------------------------------------------------
-- 7. ontime_active_recording
--    Stores at most ONE active timer per user.
--    Persists across page reloads and device switches.
-- ---------------------------------------------------------------------------
create table if not exists public.ontime_active_recording (
    id                 uuid        primary key default gen_random_uuid(),
    user_id            uuid        not null references auth.users(id) on delete cascade,
    project_id         uuid        references public.ontime_project(id) on delete set null,
    task_id            uuid        references public.ontime_task(id) on delete set null,
    is_billable        boolean     not null default false,
    title              text,
    started_at         timestamptz not null default now(),
    calendar_entry_id  uuid        references public.ontime_calendar_entry(id) on delete set null,
    created_at         timestamptz not null default now(),
    constraint ontime_active_recording_user_id_key unique (user_id)
);

alter table public.ontime_active_recording enable row level security;

create policy "Users manage own active recording"
    on public.ontime_active_recording for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. Realtime publication
--    Enables Supabase Realtime for the two tables that need live sync.
--    Run once; safe to re-run (ADD TABLE is idempotent via DO block).
-- ---------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ontime_calendar_entry'
    ) then
        alter publication supabase_realtime add table public.ontime_calendar_entry;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ontime_active_recording'
    ) then
        alter publication supabase_realtime add table public.ontime_active_recording;
    end if;
end $$;
