-- PunchCard Initial Schema Migration
-- Creates all tables, RLS policies, triggers, and functions

-- Note: Using gen_random_uuid() which is built into PostgreSQL 13+

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Linked to auth.users, stores additional user data

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  active_timer_start timestamptz,
  active_timer_project_id uuid,
  active_timer_category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles linked to Supabase Auth';

-- ============================================
-- PROJECTS TABLE
-- ============================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  client_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.projects is 'Projects for time tracking';

-- ============================================
-- CATEGORIES TABLE
-- ============================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.categories is 'Categories for time tracking';

-- ============================================
-- TIME ENTRIES TABLE
-- ============================================

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null generated always as (
    extract(epoch from (end_time - start_time)) / 60
  ) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Either project_id OR category_id must be set, not both, not neither
  constraint time_entry_has_project_or_category check (
    (project_id is not null and category_id is null) or
    (project_id is null and category_id is not null)
  ),
  -- End time must be after start time
  constraint time_entry_end_after_start check (end_time > start_time)
);

comment on table public.time_entries is 'Time tracking entries';

-- Add foreign key constraints for active timer on profiles
alter table public.profiles
  add constraint profiles_active_timer_project_fkey
  foreign key (active_timer_project_id) references public.projects(id) on delete set null;

alter table public.profiles
  add constraint profiles_active_timer_category_fkey
  foreign key (active_timer_category_id) references public.categories(id) on delete set null;

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null check (entity_type in ('time_entry', 'project', 'category', 'user')),
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Audit trail for all user actions';

-- ============================================
-- INDEXES
-- ============================================

create index idx_time_entries_user_id on public.time_entries(user_id);
create index idx_time_entries_project_id on public.time_entries(project_id);
create index idx_time_entries_category_id on public.time_entries(category_id);
create index idx_time_entries_start_time on public.time_entries(start_time desc);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_projects_is_active on public.projects(is_active) where deleted_at is null;
create index idx_categories_is_active on public.categories(is_active) where deleted_at is null;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all tables
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.categories
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.time_entries
  for each row execute function public.handle_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.categories enable row level security;
alter table public.time_entries enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
    and is_active = true
  );
end;
$$ language plpgsql security definer;

-- PROFILES POLICIES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- PROJECTS POLICIES
create policy "Authenticated users can view active projects"
  on public.projects for select
  using (auth.role() = 'authenticated' and is_active = true and deleted_at is null);

create policy "Admins can view all projects"
  on public.projects for select
  using (public.is_admin());

create policy "Admins can insert projects"
  on public.projects for insert
  with check (public.is_admin());

create policy "Admins can update projects"
  on public.projects for update
  using (public.is_admin());

create policy "Admins can delete projects"
  on public.projects for delete
  using (public.is_admin());

-- CATEGORIES POLICIES
create policy "Authenticated users can view active categories"
  on public.categories for select
  using (auth.role() = 'authenticated' and is_active = true and deleted_at is null);

create policy "Admins can view all categories"
  on public.categories for select
  using (public.is_admin());

create policy "Admins can insert categories"
  on public.categories for insert
  with check (public.is_admin());

create policy "Admins can update categories"
  on public.categories for update
  using (public.is_admin());

create policy "Admins can delete categories"
  on public.categories for delete
  using (public.is_admin());

-- TIME ENTRIES POLICIES
create policy "Users can view own time entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "Admins can view all time entries"
  on public.time_entries for select
  using (public.is_admin());

create policy "Users can insert own time entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own time entries"
  on public.time_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own time entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- AUDIT LOGS POLICIES (read-only for admins)
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (public.is_admin());

-- Allow service role to insert audit logs (for triggers/functions)
create policy "Service role can insert audit logs"
  on public.audit_logs for insert
  with check (true);
