-- Audit Logging Triggers Migration
-- Automatically logs all changes to time_entries, projects, categories, and profiles

-- ============================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================

create or replace function public.handle_audit_log()
returns trigger as $$
declare
  v_user_id uuid;
  v_action text;
  v_old_values jsonb;
  v_new_values jsonb;
begin
  -- Get the current user ID
  v_user_id := auth.uid();

  -- If no user is authenticated (e.g., service role), skip logging
  if v_user_id is null then
    if TG_OP = 'DELETE' then
      return old;
    else
      return new;
    end if;
  end if;

  -- Determine the action based on operation and table
  case TG_OP
    when 'INSERT' then
      v_action := TG_TABLE_NAME || '.created';
      v_old_values := null;
      v_new_values := to_jsonb(new);
    when 'UPDATE' then
      -- Check for special update cases
      if TG_TABLE_NAME = 'projects' or TG_TABLE_NAME = 'categories' then
        if old.deleted_at is null and new.deleted_at is not null then
          v_action := TG_TABLE_NAME || '.archived';
        else
          v_action := TG_TABLE_NAME || '.updated';
        end if;
      elsif TG_TABLE_NAME = 'profiles' then
        if old.role != new.role then
          v_action := 'user.role_changed';
        elsif old.is_active != new.is_active then
          if new.is_active then
            v_action := 'user.activated';
          else
            v_action := 'user.deactivated';
          end if;
        else
          v_action := 'user.updated';
        end if;
      else
        v_action := TG_TABLE_NAME || '.updated';
      end if;
      v_old_values := to_jsonb(old);
      v_new_values := to_jsonb(new);
    when 'DELETE' then
      v_action := TG_TABLE_NAME || '.deleted';
      v_old_values := to_jsonb(old);
      v_new_values := null;
  end case;

  -- Convert table name to entity type
  declare
    v_entity_type text;
    v_entity_id uuid;
  begin
    case TG_TABLE_NAME
      when 'time_entries' then v_entity_type := 'time_entry';
      when 'projects' then v_entity_type := 'project';
      when 'categories' then v_entity_type := 'category';
      when 'profiles' then v_entity_type := 'user';
      else v_entity_type := TG_TABLE_NAME;
    end case;

    -- Get entity ID
    if TG_OP = 'DELETE' then
      v_entity_id := old.id;
    else
      v_entity_id := new.id;
    end if;

    -- Insert the audit log
    insert into public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values
    ) values (
      v_user_id,
      v_action,
      v_entity_type,
      v_entity_id,
      v_old_values,
      v_new_values
    );
  end;

  -- Return appropriate value
  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- CREATE AUDIT TRIGGERS
-- ============================================

-- Time Entries audit triggers
create trigger audit_time_entries_insert
  after insert on public.time_entries
  for each row execute function public.handle_audit_log();

create trigger audit_time_entries_update
  after update on public.time_entries
  for each row execute function public.handle_audit_log();

create trigger audit_time_entries_delete
  after delete on public.time_entries
  for each row execute function public.handle_audit_log();

-- Projects audit triggers
create trigger audit_projects_insert
  after insert on public.projects
  for each row execute function public.handle_audit_log();

create trigger audit_projects_update
  after update on public.projects
  for each row execute function public.handle_audit_log();

create trigger audit_projects_delete
  after delete on public.projects
  for each row execute function public.handle_audit_log();

-- Categories audit triggers
create trigger audit_categories_insert
  after insert on public.categories
  for each row execute function public.handle_audit_log();

create trigger audit_categories_update
  after update on public.categories
  for each row execute function public.handle_audit_log();

create trigger audit_categories_delete
  after delete on public.categories
  for each row execute function public.handle_audit_log();

-- Profiles audit triggers (for role changes and activation)
create trigger audit_profiles_update
  after update on public.profiles
  for each row
  when (
    old.role is distinct from new.role or
    old.is_active is distinct from new.is_active or
    old.first_name is distinct from new.first_name or
    old.last_name is distinct from new.last_name
  )
  execute function public.handle_audit_log();

-- ============================================
-- UPDATE RLS POLICY FOR AUDIT LOGS
-- ============================================

-- Drop existing insert policy and create a more permissive one for the trigger
drop policy if exists "Service role can insert audit logs" on public.audit_logs;

-- Allow authenticated users to insert (needed for triggers running in user context)
create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

-- Also allow admins to delete time entries (we need this policy)
drop policy if exists "Admins can delete time entries" on public.time_entries;
create policy "Admins can delete time entries"
  on public.time_entries for delete
  using (public.is_admin());

-- Allow admins to update time entries
drop policy if exists "Admins can update time entries" on public.time_entries;
create policy "Admins can update time entries"
  on public.time_entries for update
  using (public.is_admin());
