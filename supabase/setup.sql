-- ===========================================================================
-- setup.sql  --  one-shot bootstrap for local development / assignment demo
-- ===========================================================================
-- Paste this whole file into Supabase -> SQL Editor and press Run.
-- It is idempotent, so running it twice is safe.
--
-- It performs four steps:
--   1. repairs public.handle_new_user() so sign-up honours the chosen role
--   2. promotes your first profile to Admin (no UUID needed)
--   3. inserts demo machines, alarms and maintenance work
--   4. prints a verification summary
--
-- After it finishes: Sign out, sign in again, then reload the app.
-- ===========================================================================

-- 1. Role-aware sign-up trigger --------------------------------------------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    case when lower(coalesce(new.raw_user_meta_data ->> 'role', '')) = 'admin'
      then 'admin'::public.app_role
      else 'technician'::public.app_role
    end
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any auth user that has no profile row yet.
insert into public.profiles (id, display_name, role)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1)),
  case when lower(coalesce(u.raw_user_meta_data ->> 'role', '')) = 'admin'
    then 'admin'::public.app_role
    else 'technician'::public.app_role
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 2. Promote the oldest account to Admin -----------------------------------
-- Pick the account you actually use. If you signed up several test accounts,
-- change the email below to yours.
update public.profiles p
set role = 'admin'
where p.id = (
  select u.id from auth.users u
  order by u.created_at
  limit 1
);

-- 3. Demo data --------------------------------------------------------------
insert into public.machines (machine_id, machine_name, machine_type, location, status)
values
  ('CNC-04', 'CNC Machining Center', 'CNC', 'Line A / Bay 04', 'alarm'),
  ('ROB-12', 'Assembly Robot',      'Robot',    'Line B / Cell 12', 'maintenance'),
  ('ASM-02', 'Assembly Press',      'Press',    'Line A / Bay 02', 'running'),
  ('PKG-08', 'Packaging Unit',      'Packaging','Line C / Bay 08', 'running')
on conflict (machine_id) do nothing;

-- An Admin profile is preferred as record owner; any profile works as a fallback.
insert into public.alarms (machine_id, alarm_code, description, occurred_at, cause, action_taken, status, created_by)
select m.id, 'TEMP-HIGH', 'Spindle temperature high', now() - interval '2 minutes', null, null, 'open', p.id
from public.machines m
cross join (select id from public.profiles order by (role = 'admin') desc, created_at limit 1) p
where m.machine_id = 'CNC-04'
  and not exists (select 1 from public.alarms a where a.machine_id = m.id and a.alarm_code = 'TEMP-HIGH');

insert into public.alarms (machine_id, alarm_code, description, occurred_at, cause, action_taken, status, created_by)
select m.id, 'SERVO-OL', 'Servo motor overload', now() - interval '18 minutes', 'Excessive load', 'Inspection in progress', 'in_progress', p.id
from public.machines m
cross join (select id from public.profiles order by (role = 'admin') desc, created_at limit 1) p
where m.machine_id = 'ROB-12'
  and not exists (select 1 from public.alarms a where a.machine_id = m.id and a.alarm_code = 'SERVO-OL');

insert into public.maintenance_records (machine_id, technician_id, problem, action_taken, started_at, status, created_by)
select m.id, p.id, 'Replace servo coupling', 'Machine isolated and parts requested', now() - interval '3 hours', 'in_progress', p.id
from public.machines m
cross join (select id from public.profiles order by (role = 'admin') desc, created_at limit 1) p
where m.machine_id = 'ROB-12'
  and not exists (select 1 from public.maintenance_records r where r.machine_id = m.id and r.problem = 'Replace servo coupling');

-- 4. Verification -----------------------------------------------------------
select
  u.email,
  p.display_name,
  p.role,
  (select count(*) from public.machines)  as machines,
  (select count(*) from public.alarms)    as alarms,
  (select count(*) from public.maintenance_records) as maintenance_records
from auth.users u
join public.profiles p on p.id = u.id
order by u.created_at;
