# โครงสร้างฐานข้อมูล — Supabase Database Schema

เอกสารนี้แสดงโครงสร้างฐานข้อมูลจริงของ ForgeOps ดึงออกมาจากโปรเจกต์ Supabase โดยตรง ไม่ใช่เขียนด้วยมือ

**วิธีสร้างฐานข้อมูล:** คัดลอก `supabase/setup.sql` ไปวางใน **Supabase → SQL Editor** แล้วกด Run (รันซ้ำได้) หรือถ้าต้องการติดตั้งทีละไฟล์ ให้รัน migration ตามลำดับนี้

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_assignment_hardening.sql`
3. `supabase/migrations/003_signup_role.sql`
4. `supabase/migrations/004_machine_soft_delete.sql`
5. `supabase/migrations/005_signup_role_enforcement.sql`

---

## ความสัมพันธ์ระหว่างตาราง (ERD)

```
                    auth.users
                         │
                         │ 1 : 1
                         ▼
                  ┌─────────────┐
                  │  profiles   │  (id, display_name, role)
                  └─────────────┘
                    │      ▲
       ┌────────────┘      └────────────┐
       │ 1 : N                          │ 1 : N
       │                                │
       ▼                                ▼
┌──────────────┐   1 : N        ┌────────────────────┐
│   machines   │───────────────▶│ maintenance_records│
│              │                │                    │
│ (id,         │   1 : N        └────────────────────┘
│  machine_id, │───────────────▶
│  ...         │        ┌──────┘
│  is_archived)│        │  technician_id
└──────────────┘        │
       ▲                │
       │ machine_id     │
       └────────────────┘
       │
┌──────────────┐
│    alarms    │──▶ created_by, closed_by ──▶ profiles.id
└──────────────┘
```

- `alarms.machine_id` และ `maintenance_records.machine_id` อ้างอิง `machines.id`
- `technician_id`, `created_by` และ `closed_by` อ้างอิง `profiles.id`
- `profiles.id` อ้างอิง `auth.users.id` (หนึ่งโปรไฟล์ต่อหนึ่งผู้ใช้)
- Foreign key ใช้ `ON DELETE RESTRICT` เพื่อไม่ให้ประวัติที่อ้างอิงอยู่ถูกลบทิ้งโดยไม่ตั้งใจ

Row Level Security (RLS) เปิดไว้บนทุกตารางของแอป รายละเอียดด้านล่าง

---

## รายละเอียดจากฐานข้อมูลจริง
### COLUMNS
| table | column | type | null | default |
| --- | --- | --- | --- | --- |
| alarms | `id` | uuid | no | gen_random_uuid() |
| alarms | `machine_id` | uuid | no |  |
| alarms | `alarm_code` | text | no |  |
| alarms | `description` | text | no |  |
| alarms | `occurred_at` | timestamp with time zone | no |  |
| alarms | `cause` | text | yes |  |
| alarms | `action_taken` | text | yes |  |
| alarms | `status` | USER-DEFINED | no | 'open'::alarm_status |
| alarms | `created_by` | uuid | no |  |
| alarms | `closed_by` | uuid | yes |  |
| alarms | `closed_at` | timestamp with time zone | yes |  |
| alarms | `created_at` | timestamp with time zone | no | now() |
| alarms | `updated_at` | timestamp with time zone | no | now() |
| machines | `id` | uuid | no | gen_random_uuid() |
| machines | `machine_id` | text | no |  |
| machines | `machine_name` | text | no |  |
| machines | `machine_type` | text | no |  |
| machines | `location` | text | no |  |
| machines | `status` | USER-DEFINED | no | 'stop'::machine_status |
| machines | `created_at` | timestamp with time zone | no | now() |
| machines | `updated_at` | timestamp with time zone | no | now() |
| machines | `is_archived` | boolean | no | false |
| machines | `archived_at` | timestamp with time zone | yes |  |
| machines | `archived_by` | uuid | yes |  |
| maintenance_records | `id` | uuid | no | gen_random_uuid() |
| maintenance_records | `machine_id` | uuid | no |  |
| maintenance_records | `technician_id` | uuid | no |  |
| maintenance_records | `problem` | text | no |  |
| maintenance_records | `action_taken` | text | no |  |
| maintenance_records | `started_at` | timestamp with time zone | no |  |
| maintenance_records | `completed_at` | timestamp with time zone | yes |  |
| maintenance_records | `status` | text | no | 'in_progress'::text |
| maintenance_records | `created_by` | uuid | no |  |
| maintenance_records | `created_at` | timestamp with time zone | no | now() |
| maintenance_records | `updated_at` | timestamp with time zone | no | now() |
| profiles | `id` | uuid | no |  |
| profiles | `display_name` | text | no |  |
| profiles | `role` | USER-DEFINED | no | 'technician'::app_role |
| profiles | `created_at` | timestamp with time zone | no | now() |
| profiles | `updated_at` | timestamp with time zone | no | now() |

### ENUMS
alarm_status ΓåÆ open
alarm_status ΓåÆ in_progress
alarm_status ΓåÆ closed
app_role ΓåÆ admin
app_role ΓåÆ technician
machine_status ΓåÆ running
machine_status ΓåÆ stop
machine_status ΓåÆ alarm
machine_status ΓåÆ maintenance

### PRIMARY KEYS
alarms ΓåÆ id
machines ΓåÆ id
maintenance_records ΓåÆ id
profiles ΓåÆ id

### FOREIGN KEYS
alarms.closed_by ΓåÆ profiles.id  (ON DELETE RESTRICT)
alarms.machine_id ΓåÆ machines.id  (ON DELETE RESTRICT)
alarms.created_by ΓåÆ profiles.id  (ON DELETE RESTRICT)
machines.archived_by ΓåÆ profiles.id  (ON DELETE SET NULL)
maintenance_records.machine_id ΓåÆ machines.id  (ON DELETE RESTRICT)
maintenance_records.technician_id ΓåÆ profiles.id  (ON DELETE RESTRICT)
maintenance_records.created_by ΓåÆ profiles.id  (ON DELETE RESTRICT)

### CHECK CONSTRAINTS
- alarms **alarms_code_not_blank**: CHECK ((length(btrim(alarm_code)) > 0))
- alarms **alarms_description_not_blank**: CHECK ((length(btrim(description)) > 0))
- alarms **closed_alarm_has_resolution**: CHECK (((status <> 'closed'::alarm_status) OR ((length(btrim(COALESCE(cause, ''::text))) > 0) AND (length(btrim(COALESCE(action_taken, ''::text))) > 0) AND (closed_by IS NOT NULL) AND (closed_at IS NOT NULL))))
- machines **archived_machine_is_stopped**: CHECK (((NOT is_archived) OR (status = 'stop'::machine_status)))
- machines **machines_location_not_blank**: CHECK ((length(btrim(location)) > 0))
- machines **machines_machine_id_format**: CHECK ((machine_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$'::text))
- machines **machines_machine_id_not_blank**: CHECK (((length(btrim(machine_id)) >= 2) AND (length(btrim(machine_id)) <= 32)))
- machines **machines_machine_name_not_blank**: CHECK ((length(btrim(machine_name)) > 0))
- machines **machines_machine_type_not_blank**: CHECK ((length(btrim(machine_type)) > 0))
- maintenance_records **maintenance_action_not_blank**: CHECK ((length(btrim(action_taken)) > 0))
- maintenance_records **maintenance_dates_valid**: CHECK (((completed_at IS NULL) OR (completed_at >= started_at)))
- maintenance_records **maintenance_problem_not_blank**: CHECK ((length(btrim(problem)) > 0))
- maintenance_records **maintenance_records_status_check**: CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text])))

### UNIQUE INDEXES
- alarms: CREATE UNIQUE INDEX alarms_pkey ON public.alarms USING btree (id)
- machines: CREATE UNIQUE INDEX machines_pkey ON public.machines USING btree (id)
- machines: CREATE UNIQUE INDEX machines_machine_id_key ON public.machines USING btree (machine_id)
- machines: CREATE UNIQUE INDEX machines_machine_id_lower_unique ON public.machines USING btree (lower(machine_id))
- maintenance_records: CREATE UNIQUE INDEX maintenance_records_pkey ON public.maintenance_records USING btree (id)
- profiles: CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)

### RLS POLICIES
- **alarms** ┬╖ `admins delete alarms` ┬╖ DELETE ┬╖ to {authenticated}
  - using: is_admin()
  - with check: ΓÇö
- **alarms** ┬╖ `admins update alarms` ┬╖ UPDATE ┬╖ to {authenticated}
  - using: is_admin()
  - with check: is_admin()
- **alarms** ┬╖ `authenticated users create alarms` ┬╖ INSERT ┬╖ to {authenticated}
  - using: ΓÇö
  - with check: (created_by = auth.uid())
- **alarms** ┬╖ `authenticated users read alarms` ┬╖ SELECT ┬╖ to {authenticated}
  - using: true
  - with check: ΓÇö
- **alarms** ┬╖ `technicians update alarm workflow` ┬╖ UPDATE ┬╖ to {authenticated}
  - using: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'technician'::app_role))))
  - with check: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'technician'::app_role))))
- **machines** ┬╖ `admins manage machines` ┬╖ ALL ┬╖ to {authenticated}
  - using: is_admin()
  - with check: is_admin()
- **machines** ┬╖ `authenticated users read machines` ┬╖ SELECT ┬╖ to {authenticated}
  - using: true
  - with check: ΓÇö
- **maintenance_records** ┬╖ `admins delete maintenance` ┬╖ DELETE ┬╖ to {authenticated}
  - using: is_admin()
  - with check: ΓÇö
- **maintenance_records** ┬╖ `admins or assigned technicians update maintenance` ┬╖ UPDATE ┬╖ to {authenticated}
  - using: (is_admin() OR (technician_id = auth.uid()))
  - with check: (is_admin() OR (technician_id = auth.uid()))
- **maintenance_records** ┬╖ `admins or technicians create maintenance` ┬╖ INSERT ┬╖ to {authenticated}
  - using: ΓÇö
  - with check: ((is_admin() OR (technician_id = auth.uid())) AND (created_by = auth.uid()))
- **maintenance_records** ┬╖ `authenticated users read maintenance` ┬╖ SELECT ┬╖ to {authenticated}
  - using: true
  - with check: ΓÇö
- **profiles** ┬╖ `admins manage profiles` ┬╖ ALL ┬╖ to {authenticated}
  - using: is_admin()
  - with check: is_admin()
- **profiles** ┬╖ `admins read profiles` ┬╖ SELECT ┬╖ to {authenticated}
  - using: is_admin()
  - with check: ΓÇö
- **profiles** ┬╖ `users read own profile` ┬╖ SELECT ┬╖ to {authenticated}
  - using: (id = auth.uid())
  - with check: ΓÇö

### FUNCTIONS
#### `handle_new_user`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
```

#### `is_admin`
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$function$
```

#### `set_machine_archive_actor`
```sql
CREATE OR REPLACE FUNCTION public.set_machine_archive_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.is_archived then
      new.archived_by = coalesce(auth.uid(), new.archived_by);
      new.archived_at = coalesce(new.archived_at, now());
    else
      new.archived_at = null;
      new.archived_by = null;
    end if;
    return new;
  end if;

  new.id = old.id;
  new.created_at = old.created_at;

  if new.is_archived and not old.is_archived then
    new.archived_by = coalesce(auth.uid(), old.archived_by);
    new.archived_at = coalesce(new.archived_at, now());
    new.status = 'stop';
  elsif not new.is_archived and old.is_archived then
    new.archived_at = null;
    new.archived_by = null;
  else
    new.archived_at = old.archived_at;
    new.archived_by = old.archived_by;
  end if;

  -- Only an admin may archive or restore a machine. The row-level policies already
  -- restrict writes to admins, this keeps the intent enforced inside the database too.
  if not public.is_admin() then
    if new.is_archived <> old.is_archived then
      raise exception 'only admins can archive or restore machines';
    end if;
  end if;

  return new;
end;
$function$
```

#### `set_record_actor`
```sql
CREATE OR REPLACE FUNCTION public.set_record_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_table_name = 'alarms' then
    if tg_op = 'INSERT' then
      new.created_by = coalesce(auth.uid(), new.created_by);
      if new.status = 'closed' then
        new.closed_by = auth.uid();
        new.closed_at = now();
      else
        new.closed_by = null;
        new.closed_at = null;
      end if;
    else
      new.id = old.id;
      new.created_by = old.created_by;
      new.created_at = old.created_at;
      if new.status = 'closed' then
        if old.status <> 'closed' then
          new.closed_by = auth.uid();
          new.closed_at = now();
        else
          new.closed_by = old.closed_by;
          new.closed_at = old.closed_at;
        end if;
      else
        new.closed_by = null;
        new.closed_at = null;
      end if;
      if not public.is_admin() then
        if new.machine_id <> old.machine_id or new.alarm_code <> old.alarm_code or new.description <> old.description or new.occurred_at <> old.occurred_at then
          raise exception 'technicians can only update alarm workflow fields';
        end if;
      end if;
    end if;
  elsif tg_table_name = 'maintenance_records' then
    if tg_op = 'INSERT' then
      new.created_by = coalesce(auth.uid(), new.created_by);
      if new.status = 'completed' then new.completed_at = now(); else new.completed_at = null; end if;
    else
      new.id = old.id;
      new.created_by = old.created_by;
      new.created_at = old.created_at;
      if new.status = 'completed' then
        if old.status = 'completed' then new.completed_at = old.completed_at; else new.completed_at = now(); end if;
      else
        new.completed_at = null;
      end if;
      if not public.is_admin() and auth.uid() is not null then
        new.technician_id = auth.uid();
        if new.machine_id <> old.machine_id then
          raise exception 'technicians cannot change maintenance ownership';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$function$
```

#### `set_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end;
$function$
```


### TRIGGERS
- alarms: CREATE TRIGGER alarms_actor BEFORE INSERT OR UPDATE ON public.alarms FOR EACH ROW EXECUTE FUNCTION set_record_actor()
- alarms: CREATE TRIGGER alarms_updated_at BEFORE UPDATE ON public.alarms FOR EACH ROW EXECUTE FUNCTION set_updated_at()
- machines: CREATE TRIGGER machines_archive_actor BEFORE INSERT OR UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION set_machine_archive_actor()
- machines: CREATE TRIGGER machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION set_updated_at()
- maintenance_records: CREATE TRIGGER maintenance_actor BEFORE INSERT OR UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION set_record_actor()
- maintenance_records: CREATE TRIGGER maintenance_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION set_updated_at()
- profiles: CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()
- users: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()

---

## คำสั่งตรวจสอบสคีมาด้วยตนเอง

รันคำสั่งเหล่านี้ใน Supabase SQL Editor เพื่อดูโครงสร้างปัจจุบัน

```sql
-- คอลัมน์ทั้งหมดของทุกตาราง
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- ความสัมพันธ์ Foreign Key
select tc.table_name, kcu.column_name,
       ccu.table_name as ref_table, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name;

-- RLS Policy ทั้งหมด
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Trigger ทั้งหมด
select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'auth') and not t.tgisinternal;
```

## ข้อมูลตัวอย่าง

หลังรัน `supabase/setup.sql` ระบบจะมีข้อมูลตัวอย่าง 4 เครื่อง 2 alarm และ 1 maintenance เพื่อให้ Dashboard และหน้าจอรายงานมีตัวเลขให้ดู ไม่ใช่ศูนย์ทั้งหมด