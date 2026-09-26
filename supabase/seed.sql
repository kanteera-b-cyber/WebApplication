-- Optional demo data for local development.
-- Run after both migrations and after at least one Admin profile exists.

insert into public.machines (machine_id, machine_name, machine_type, location, status)
values
  ('CNC-04', 'CNC Machining Center', 'CNC', 'Line A / Bay 04', 'alarm'),
  ('ROB-12', 'Assembly Robot', 'Robot', 'Line B / Cell 12', 'maintenance'),
  ('ASM-02', 'Assembly Press', 'Press', 'Line A / Bay 02', 'running'),
  ('PKG-08', 'Packaging Unit', 'Packaging', 'Line C / Bay 08', 'running')
on conflict (machine_id) do nothing;

insert into public.alarms (machine_id, alarm_code, description, occurred_at, cause, action_taken, status, created_by)
select m.id, 'TEMP-HIGH', 'Spindle temperature high', now() - interval '2 minutes', null, null, 'open', p.id
from public.machines m
cross join (select id from public.profiles where role = 'admin' order by created_at limit 1) p
where m.machine_id = 'CNC-04'
  and not exists (select 1 from public.alarms a where a.machine_id = m.id and a.alarm_code = 'TEMP-HIGH');

insert into public.alarms (machine_id, alarm_code, description, occurred_at, cause, action_taken, status, created_by)
select m.id, 'SERVO-OL', 'Servo motor overload', now() - interval '18 minutes', 'Excessive load', 'Inspection in progress', 'in_progress', p.id
from public.machines m
cross join (select id from public.profiles where role = 'admin' order by created_at limit 1) p
where m.machine_id = 'ROB-12'
  and not exists (select 1 from public.alarms a where a.machine_id = m.id and a.alarm_code = 'SERVO-OL');

insert into public.maintenance_records (machine_id, technician_id, problem, action_taken, started_at, status, created_by)
select m.id, p.id, 'Replace servo coupling', 'Machine isolated and parts requested', now() - interval '3 hours', 'in_progress', p.id
from public.machines m
cross join (select id from public.profiles where role = 'admin' order by created_at limit 1) p
where m.machine_id = 'ROB-12'
  and not exists (select 1 from public.maintenance_records r where r.machine_id = m.id and r.problem = 'Replace servo coupling');
