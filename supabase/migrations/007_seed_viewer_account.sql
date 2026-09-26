-- 007_dark_mode.sql
--
-- Runs after 006_bonus_features.sql. A Viewer account is useful for a demo but
-- has no way to log in today, because the signup form only offers Technician and
-- Admin. Seed one so every role in section 7 of the assignment can be shown.
--
-- The password is a demo value. Change it before showing the system to anyone
-- outside the team.

do $$
declare
  v_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'viewer@example.com') then
    v_id := gen_random_uuid();
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (v_id, 'viewer@example.com', now(),
            '{"display_name":"Viewer Demo","role":"viewer"}'::jsonb, now(), now());
  else
    select id into v_id from auth.users where email = 'viewer@example.com';
  end if;

  insert into public.profiles (id, display_name, role)
  values (v_id, 'Viewer Demo', 'viewer')
  on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;
end
$$;
