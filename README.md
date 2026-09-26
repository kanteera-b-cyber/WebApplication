# ForgeOps — ระบบจัดการ Alarm และงานบำรุงรักษา

Web application สำหรับทีมงาน Automation ในโรงงาน ใช้จัดการข้อมูลเครื่องจักรหลัก (Machine Master), เหตุแจ้งเตือนเครื่องจักร (Alarm) และงานบำรุงรักษา (Maintenance) พร้อมสถานะการทำงานแบบเรียลไทม์ โปรเจกต์นี้จัดทำตามข้อกำหนดวิชา *Programming in Automation Systems*

![CI](https://github.com/kanteera-b-cyber/WebApplication/actions/workflows/ci.yml/badge.svg)

## 1. วัตถุประสงค์

- ให้มีพื้นที่ทำงาน (workspace) เดียวสำหรับเครื่องจักรในสายการผลิต
- บันทึก ตรวจสอบสาเหตุ และปิดเหตุแจ้งเตือนของเครื่องจักร
- บันทึกงานบำรุงรักษาและสถานะการดำเนินงาน
- แสดงสรุปจำนวนเครื่องจักร เหตุแจ้งเตือน และงานบำรุงรักษาแบบเรียลไทม์
- บังคับสิทธิ์ของ Admin และ Technician ทั้งที่ชั้น UI และที่ชั้น Supabase Row Level Security (RLS)
- ใช้เทคโนโลยีสมัยใหม่ ได้แก่ Supabase, Next.js, Tailwind CSS, GitHub Actions และ Vercel

## 2. เทคโนโลยีที่ใช้

| รายการ | เวอร์ชัน / รายละเอียด |
| --- | --- |
| Next.js | 16 App Router + TypeScript |
| React | 19 |
| Tailwind CSS | 4 (ผ่าน `@theme` และ utility classes ทั้งหมด) |
| Supabase | Authentication, PostgreSQL, Row Level Security |
| GitHub | เก็บ Source Code และประวัติการพัฒนา |
| GitHub Actions | Continuous Integration (CI) |
| Vercel | การ Deploy ระบบ |
| AI | ช่วยวิเคราะห์โจทย์ เขียนโค้ด หาและแก้บั๊ก จัดทำเอกสาร |

## 3. Function หลักของระบบ

### 3.1 ระบบผู้ใช้งาน (Authentication & Role)

- Login และ Logout โดยใช้ Supabase Authentication แบบอีเมล/รหัสผ่าน
- ผู้ใช้ใหม่สมัครสมาชิกจากหน้า Login และเลือก Role เป็น `Technician` หรือ `Admin` โดย Role ที่เลือกถูกตรวจสอบซ้ำที่ชั้นฐานข้อมูลอีกครั้ง
- Role ทั้งสองเก็บไว้ในตาราง `public.profiles`
- **Admin**: จัดการ Machine, Alarm, Maintenance และข้อมูลหลักของระบบได้ทั้งหมด
- **Technician**: ดูข้อมูลเครื่องจักรและ Dashboard, บันทึก/แก้ไข Maintenance ที่ได้รับมอบหมาย, เปลี่ยนสถานะ Alarm และบันทึก Alarm ใหม่
- Next.js `proxy.ts` ทำหน้าที่ป้องกันเส้นทาง (route protection) ส่วน PostgreSQL RLS เป็นขอบเขตสิทธิ์การเข้าถึงขั้นสุดท้าย

#### ตารางความสามารถตาม Role

| ความสามารถ | ชั้น UI | RLS Policy | ตัวป้องกันเพิ่มที่ฐานข้อมูล |
| --- | --- | --- | --- |
| ดูข้อมูลเครื่องจักร | `machine-console.tsx` แสดงแบบอ่านอย่างเดียว ขึ้นว่า "View only" | `authenticated users read machines` | — |
| เพิ่ม / แก้ / Archive เครื่องจักร | `canManage = role === "admin"` ซ่อนปุ่มทั้งหมด | `admins manage machines` | — |
| บันทึก Maintenance | ระบบบังคับให้ Technician เป็นเจ้าของงาน | `admins or technicians create maintenance` | `set_record_actor()` ตั้ง `created_by` / `completed_at` |
| แก้ไข Maintenance | `canEditRecord()` อนุญาตเฉพาะงานของตัวเอง | `admins or assigned technicians update maintenance` | `set_record_actor()` บังคับ `technician_id = auth.uid()` |
| เปลี่ยนสถานะ Alarm | `canManageDetails` จำกัดฟอร์มเหลือ status / cause / action | `technicians update alarm workflow` | `set_record_actor()` ตอก error เมื่อพยายามแก้ field อื่น |
| ดู Dashboard | ไม่มีการจำกัดตาม Role | `authenticated users read alarms` / `authenticated users read maintenance` | — |
| เลื่อนสิทธิ์ตัวเองเป็น Admin | หน้า `/users` เข้าได้เฉพาะ Admin ที่เหลือจะถูก redirect | `admins manage profiles` | — |

**ข้อสังเกต 2 ข้อสำหรับผู้ตรวจ:**

- โจทย์ระบุให้ Technician ทำ *เปลี่ยนสถานะ Alarm* และให้ Admin ทำ *จัดการ Alarm* แต่ระบบนี้เปิดให้ Technician **บันทึก Alarm** เพิ่มด้วย เพราะในโรงงานจริงช่างเทคนิคที่อยู่หน้าเครื่องมักเป็นผู้บันทึกเหตุแจ้งเตือน โดยใช้ policy `authenticated users create alarms` และ `created_by` ถูกบังคับเป็นผู้ใช้ที่ล็อกอินเสมอ หากต้องการแยกสิทธิ์เข้มขึ้น แก้ policy ได้ในบรรทัดเดียว
- Technician แก้ไข Maintenance ได้เฉพาะรายการที่ได้รับมอบหมาย บังคับด้วย policy `admins or assigned technicians update maintenance` จึงไม่สามารถแก้งานของช่างคนอื่นได้

**หมายเหตุเรื่อง RLS:** เมื่อการเขียนข้อมูลถูก RLS ปฏิเสธ PostgREST จะกรองแถวนั้นทิ้งและตอบ `204 No Content` แทนที่จะตอบเป็น error เพราะไม่มีแถวที่ match ส่วนโค้ดแอปตรวจจับกรณีนี้แล้วและแสดงข้อความว่าไม่มีสิทธิ์ แทนที่จะรายงานว่าสำเร็จ (ดู `changeStatus` ใน `alarm-console.tsx` และ `destroy` ใน `machine-console.tsx`)

### 3.2 Machine Master

- **ฟิลด์**: Machine ID, Machine Name, Machine Type, Location, Status
- **สถานะ**: `Running`, `Stop`, `Alarm`, `Maintenance`
- Admin สามารถ Create, Read, Update และ Delete ได้
- Machine ID ตรวจซ้ำทั้งที่เบราว์เซอร์และที่ฐานข้อมูลด้วย unique index แบบไม่สนตัวพิมพ์ (`lower(machine_id)`)
- การ Archive เก็บเครื่องออกจากรายการที่ใช้งานอยู่ แต่คงประวัติ Alarm และ Maintenance ไว้ทั้งหมด และเครื่องที่ Archive แล้วจะถูกบังคับเป็นสถานะ `Stop` เพื่อไม่ให้ตัวนับบน Dashboard เพี้ยน

### 3.3 Alarm Record

- **ฟิลด์**: Machine, Alarm Code, Alarm Description, Date/Time, Cause, Action Taken, Status
- **สถานะ**: `Open`, `In Progress`, `Closed`
- สามารถ Create, Read และ Update ได้
- Alarm ต้องมีทั้ง Cause และ Action Taken ก่อนจึงจะปิดเป็น `Closed` ได้
- Admin แก้ได้ทุก field · Technician แก้ได้เฉพาะ field ของ workflow ตามที่ policy อนุญาต

### 3.4 Maintenance Record

- **ฟิลด์**: Machine, Technician, Problem, Action Taken, Started At, Status และเวลาที่ปิดงาน
- **สถานะ**: `In Progress`, `Completed`
- สามารถ Create, Read และ Update ได้
- Technician ถูกบังคับให้เป็นเจ้าของงานของตัวเองเท่านั้น

#### ตารางแสดงความครอบคลุมข้อกำหนด 3.2 – 3.4

| ข้อกำหนด | การดำเนินการ | ผลการตรวจสอบ |
| --- | --- | --- |
| 3.2 ฟิลด์ Machine ID, Machine Name, Machine Type, Location, Status | ตาราง `machines` + modal ใน `machine-console.tsx` | ครบ 5/5 ฟิลด์ |
| 3.2 สถานะ Running, Stop, Alarm, Maintenance | enum `machine_status` | รับได้ครบทั้ง 4 ค่า |
| 3.2 Machine Master CRUD | เพิ่ม / แก้ / archive / restore / ลบ ใน `machine-console.tsx` | ผ่านครบทั้ง 4 การกระทำ |
| 3.3 ฟิลด์ Machine, Alarm Code, Alarm Description, Date/Time, Cause, Status | ตาราง `alarms` + modal ใน `alarm-console.tsx` | ครบ 6/6 ฟิลด์ |
| 3.3 สถานะ Open, In Progress, Closed | enum `alarm_status` | ทั้ง 3 ค่าเปลี่ยนได้ |
| 3.3 Alarm Record Create, Read, Update | `alarm-console.tsx` | ผ่านทั้งหมด |
| 3.4 Maintenance Record Create, Read, Update | `maintenance-console.tsx` | ผ่านทั้งหมด |

**เรื่อง Delete ของ Machine Master:** ปุ่ม Delete แสดงให้ Admin ทุกแถว แต่เครื่องที่ยังถูกอ้างอิงโดย Alarm หรือ Maintenance จะถูกฐานข้อมูลปฏิเสธด้วย foreign key violation และระบบจะแนะนำให้ใช้ **Archive** แทน เพราะ Archive เก็บประวัติไว้ครบถ้วน นี่เป็นการตัดสินใจด้านความถูกต้องของข้อมูลอย่างตั้งใจ ไม่ใช่ฟีเจอร์ที่ขาด และเข้าถึงได้ทั้งสองทางจากแถวเดียวกัน

### 3.5 Search และ Filter

| หน้า | เงื่อนไขที่ใช้กรอง | จำนวนเงื่อนไข |
| --- | --- | --- |
| Machines | ค้นข้อความ (ID / ชื่อ / ชนิด / ตำแหน่ง) + สถานะ + ขอบเขต archived | 3 |
| Alarms | ค้นข้าความ (เครื่อง / code / รายละเอียด) + สถานะ | 2 |
| Maintenance | ค้นข้อความ (ปัญหา / งานที่ทำ / เครื่อง / ช่าง) + สถานะ | 2 |
| Dashboard | ค้นข้อความ + ช่วงเวลา 24 ชั่วโมง / 7 วัน | 2 |

ครอบคลุมเป้าหมายการค้นหาครบทั้ง 5 หัวข้อตามโจทย์ ได้แก่ Machine, Status, Alarm Code, Technician และ Date

### 3.6 Dashboard

- แสดงจำนวนเครื่องจักรทั้งหมด (การ์ด "Total machines" และตัวเลขกลาง donut)
- แสดงจำนวนเครื่องจักรแยกตามสถานะ Running, Stop, Alarm และ Maintenance (legend ของกราฟ donut พิมพ์จำนวนแต่ละสถานะ)
- แสดงจำนวน Alarm ที่ยัง active และจำนวนงาน Maintenance
- สรุปข้อมูลเป็นกราฟได้ ได้แก่ กราฟ donut แหวนสถานะเครื่องจักร, คิวเหตุแจ้งเตือน, อัตราการทำงานเครื่องจักร และแถบสรุปอัตราการปิดงานบำรุงรักษา
- ข้อมูลทั้งหมดมาจาก route `/api/dashboard` ที่ต้องผ่านการยืนยันตัวตนก่อน
- หน้า Reports ส่งออกข้อมูล Machine, Alarm และ Maintenance ปัจจุบันเป็นไฟล์ CSV

### 3.7 Input Validation

- ช่องข้อมูลสำคัญห้ามว่าง — บังคับด้วย `not null` และ check constraint `length(btrim(...)) > 0` บนคอลัมน์ข้อความทุกคอลัมน์
- Machine ID ห้ามซ้ำ — unique index `machines_machine_id_lower_unique` บน `lower(machine_id)` และซ้ำแบบตัวพิมพ์ต่างกันก็ถูกปฏิเสธเช่นกัน
- รูปแบบข้อมูลถูกต้อง — Machine ID ต้องตรง regex `^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$` และค่าของ Status ต้องเป็น enum ที่กำหนดไว้เท่านั้น
- แสดงข้อความแจ้งเตือนเมื่อข้อมูลไม่ถูกต้อง — ฟังก์ชัน `describeWriteError` แปลงรหัส error ของ Postgres แต่ละแบบเป็นข้อความที่ระบุวิธีแก้ได้ แสดงผ่าน `role="alert"`

ผลการตรวจสอบ Input Validation ด้วยการยิงคำขอจริง 13 รายการ **ผ่านทั้ง 13 รายการ** ได้แก่ ช่องว่าง, Machine ID ซ้ำ, Machine ID ซ้ำแบบต่างตัวพิมพ์, รูปแบบผิด, สั้นเกิน, ยาวเกิน, Status ไม่มีในระบบ, Alarm Code ว่าง, Alarm Description ว่าง, Maintenance Problem ว่าง และ Status ที่ไม่มีในระบบ

## 4. โครงสร้างฐานข้อมูล

### 4.1 ตารางข้อมูล

> เอกสารสคีมาฉบับเต็มพร้อม ERD, Foreign Key, RLS Policy, Trigger และฟังก์ชัน อยู่ที่ [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)

| ตาราง | คอลัมน์ | ความสัมพันธ์ |
| --- | --- | --- |
| `profiles` | `id`, `display_name`, `role` | 1 profile ต่อผู้ใช้ Supabase Auth |
| `machines` | `id`, `machine_id`, `machine_name`, `machine_type`, `location`, `status`, `is_archived`, `archived_at`, `archived_by` | — |
| `alarms` | `id`, `machine_id`, `alarm_code`, `description`, `occurred_at`, `cause`, `action_taken`, `status`, `created_by`, `closed_by`, `closed_at` | `machine_id` → `machines.id` |
| `maintenance_records` | `id`, `machine_id`, `technician_id`, `problem`, `action_taken`, `started_at`, `completed_at`, `status`, `created_by` | `machine_id` → `machines.id`, `technician_id` → `profiles.id` |

เปิด RLS ไว้บนทุกตารางของแอป Foreign key ใช้ `on delete restrict` เพื่อไม่ให้ประวัติที่อ้างอิงอยู่ถูกลบทิ้งโดยไม่ตั้งใจ

### 4.2 การติดตั้งฐานข้อมูล (แนะนำวิธีเร็วที่สุด)

คัดลอกเนื้อหาไฟล์ `supabase/setup.sql` ไปวางใน **Supabase → SQL Editor** แล้วกด **Run** ไฟล์นี้รันซ้ำได้ (idempotent) จึงไม่เป็นไรถ้ารันมากกว่าหนึ่งครั้ง โดยจะทำงาน 4 อย่าง:

1. ซ่อม trigger การสมัครสมาชิกให้ใช้ Role ที่ผู้ใช้เลือกจริง
2. เลื่อนบัญชีแรกที่สมัครเป็น Admin เพื่อให้เริ่มจัดการข้อมูลได้
3. ใส่ข้อมูลตัวอย่าง 4 เครื่อง, 2 alarm และ 1 maintenance
4. แสดงตารางสรุปบัญชีและ Role ทั้งหมดท้ายไฟล์

จากนั้นออกจากระบบแล้วเข้าใหม่ เนื่องจากระบบอ่านค่า Role เพียงครั้งเดียวตอนหน้าเว็บโหลด

### 4.3 การติดตั้งสคีมาทีละไฟล์

หากต้องการติดตั้งสคีมาจากศูนย์ ให้รันไฟล์ต่อไปนี้ใน Supabase SQL Editor ตามลำดับ

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_assignment_hardening.sql`
3. `supabase/migrations/003_signup_role.sql`
4. `supabase/migrations/004_machine_soft_delete.sql`
5. `supabase/migrations/005_signup_role_enforcement.sql`

ข้อมูลตัวอย่างสำหรับทดลองใช้งานเพิ่มเติมอยู่ใน `supabase/seed.sql`

> **ข้อควรระวัง:** `003_signup_role.sql` เขียนทับเฉพาะฟังก์ชัน `public.handle_new_user()` ส่วน trigger `on_auth_user_created` ถูกสร้างโดย `001_initial_schema.sql` ดังนั้น `005_signup_role_enforcement.sql` จึงเขียนทับทั้งฟังก์ชันและสร้าง trigger ใหม่อีกครั้ง เพื่อซ่อมโปรเจกต์ที่มีฟังก์ชันเวอร์ชันเก่าซึ่งกำหนด role เป็น `technician` แบบตายตัว

## 5. วิธีติดตั้งและใช้งาน

### 5.1 ความต้องการของระบบ

- Node.js เวอร์ชัน 20.9 ขึ้นไป
- โปรเจกต์ Supabase 1 โปรเจกต์
- บัญชีผู้ใช้ Supabase แยกสำหรับแต่ละ Role

### 5.2 ติดตั้งและตั้งค่า

```bash
npm install
cp .env.example .env.local
```

กำหนดค่าในไฟล์ `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> ห้ามใส่ Supabase Service Role Key ในตัวแปร `NEXT_PUBLIC_*` หรือในโค้ดฝั่ง client โดยเด็ดขาด

### 5.3 ปิดการยืนยันอีเมลเพื่อให้สมัครสมาชิกได้

ไปที่ **Supabase Dashboard → Authentication → Sign In / Providers → Email** แล้ว **ปิด** ตัวเลือก **Confirm email**

หากไม่ทำขั้นตอนนี้ ฟอร์มสมัครสมาชิกจะใช้งานไม่ได้ในโปรเจกต์ใหม่ เพราะบริการอีเมลในตัวของ Supabase มีโควตาต่อชั่วโมงน้อยมาก อีเมลยืนยันจึงไม่ถูกส่งออกไป

### 5.4 แก้ปัญหาสมัครสมาชิกแล้วได้ Role เป็น Technician ทั้งหมด

**อาการ:** เลือก Role **Admin** ในฟอร์มสมัครสมาชิก แต่เข้าเว็บแล้วระบบแสดง **Technician** และปุ่มสำหรับ Admin ไม่ปรากฏ

**ตรวจสอบ** ด้วยคำสั่งนี้ใน Supabase SQL Editor จะเห็นว่า `requested_role` เป็น `admin` แต่ `role` เป็น `technician`

```sql
select u.email, p.role, u.raw_user_meta_data ->> 'role' as requested_role
from auth.users u
join public.profiles p on p.id = u.id
order by u.created_at desc;
```

**สาเหตุ:** ฟังก์ชัน `public.handle_new_user()` ที่ใช้งานอยู่เป็นเวอร์ชันเก่าที่กำหนด role เป็น `technician` แบบตายตัว และไม่ได้อ่าน role จาก `raw_user_meta_data` เลย

**วิธีแก้:** รัน `supabase/migrations/005_signup_role_enforcement.sql` ใน SQL Editor แล้วสมัครสมาชิกใหม่ ไฟล์นี้รันซ้ำได้

**การเลื่อนบัญชีเดิมเป็น Admin:** โปรไฟล์ที่สร้างก่อนแก้ไขจะยังคง role เดิม และบัญชีที่สร้างผ่านหน้า Dashboard ของ Supabase จะเป็น Technician เสมอ เพราะ Dashboard ไม่ได้ส่งข้อมูล role มา ใช้คำสั่งนี้โดยแทนค่า UUID จาก **Authentication → Users**

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH-USER-UUID-HERE';
```

### 5.5 รันระบบ

```bash
npm run dev
```

เปิด `http://localhost:3000/login`

### 5.6 แก้ปัญหาการเข้าสู่ระบบ

สาเหตุที่พบบ่อยที่สุดคือค่า **Confirm email** เมื่อเปิดใช้งาน Supabase จะไม่คืน session หลังสมัครสมาชิก แต่จะส่งอีเมลยืนยันแทน ซึ่งในโปรเจกต์ใหม่มักไม่ถูกส่ง

ตรวจสถานะปัจจุบันของโปรเจกต์ได้ด้วยคำสั่ง

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

- `mailer_autoconfirm: true` หมายถึงสมัครสมาชิกแล้วเข้าใช้งานได้ทันทีโดยไม่ต้องยืนยันอีเมล
- `mailer_autoconfirm: false` หมายถึงต้องยืนยันอีเมลก่อน

ปัญหาอื่นที่ควรตรวจสอบ

- สร้างผู้ใช้ได้ที่ Supabase → Authentication → Users
- ยืนยันอีเมลก่อนเข้าสู่ระบบเมื่อเปิด Email Confirmation
- รีสตาร์ท dev server หลังแก้ไข `.env.local`
- หากเบราว์เซอร์กลับไปที่ `/login` แม้ล็อกอินสำเร็จ ให้ล้าง cookie ของ `localhost` แล้วลองใหม่
- ห้ามส่งรหัสผ่านหรือคีย์ของ Supabase มาในรายงานปัญหา

## 6. การตรวจสอบคุณภาพ

```bash
npm run lint
npm run typecheck
npm run build
```

### 6.1 GitHub Actions (CI)

Workflow ที่ `.github/workflows/ci.yml` ทำงานอัตโนมัติทุกครั้งที่ push เข้า `main` และทุก pull request แบ่งเป็น 5 ขั้นตอนที่มีชื่อชัดเจน เพื่อให้แท็บ Actions แสดงว่าขั้นตอนใดล้มเหลว

| ขั้นตอน | คำสั่ง |
| --- | --- |
| 1. Install dependencies | `npm ci` |
| 2. Lint | `npm run lint` |
| 3. Generate Next.js route types | `npx next typegen` |
| 4. Typecheck | `npm run typecheck` |
| 5. Build | `npm run build` |

ต้องรัน `next typegen` ก่อนตรวจ TypeScript เพราะชนิดอย่าง `LayoutProps` ถูกสร้างไว้ใน `.next/types/` ซึ่งอยู่ใน `.gitignore` เครื่องที่ checkout ใหม่จึงไม่มีไฟล์นี้

เมื่อการทำงานจบจะมีตารางสรุปผล `CI result` แสดงบนหน้า job summary และ workflow จะรายงานผลเป็น Passed หรือ Failed ชัดเจน กลุ่ม `concurrency` จะยกเลิกการทำงานเก่าที่ค้างอยู่เมื่อมีการ push branch เดิมซ้ำ ทำให้สถานะบน badge สะท้อน commit ล่าสุดเสมอ

### 6.2 รายการตรวจสอบด้วยตนเอง

- ผู้ใช้ที่ยังไม่ล็อกอินจะถูก redirect ไปที่ `/login` จากทุกโมดูลของระบบ
- Technician มองไม่เห็นและเรียกใช้ปุ่มจัดการเครื่องจักรของ Admin ไม่ได้
- เครื่องจักรที่สร้างใหม่สามารถแก้ไขและลบได้โดยใช้ ID ที่ฐานข้อมูลสร้างให้
- Alarm สามารถสร้าง แก้ไข กำหนด Cause/Action และปิดได้
- Maintenance สามารถสร้างโดย Technician แก้ไข และปิดงานได้
- การค้นหาและกรองตามสถานะคืนค่าที่ถูกต้อง
- ตัวเลขบน Dashboard และมุมมองเครื่องจักร/Alarm มาจาก Supabase โดยตรง

## 7. การ Deploy

1. ส่งโค้ดขึ้น GitHub
   ```bash
   git push -u origin main
   ```
2. เข้าเว็บ [vercel.com](https://vercel.com) เลือก **Add New → Project** แล้ว import repository `kanteera-b-cyber/WebApplication` ระบบจะตรวจจับ Next.js 16 ให้เอง ไม่ต้องตั้งค่าการ build
3. ก่อน deploy ครั้งแรก ให้เพิ่มตัวแปรสภาพแวดล้อม (Vercel จะถามระหว่าง import หรือเพิ่มภายหลังที่ **Project → Settings → Environment Variables**)

   | ชื่อตัวแปร | ค่า |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | คีย์ `sb_publishable_...` จาก Supabase → Project Settings → API |

   ติ๊กให้ครบทั้ง **Production**, **Preview** และ **Development** · ไม่จำเป็นต้องใช้และห้ามใส่ Service Role Key
4. รัน migration ทั้ง 5 ไฟล์ (หรือ `supabase/setup.sql`) กับโปรเจกต์ Supabase ก่อนทดสอบ
5. Deploy แล้วทดสอบ `/login`, `/dashboard`, `/machines`, `/alarms` และ `/maintenance` บน URL ของ Vercel

ระบบต้องการ Node.js เวอร์ชัน 20.9 ขึ้นไป โดย `package.json` ระบุ `engines.node` ไว้เพื่อให้ Vercel เลือก runtime ที่เข้ากันได้

**GitHub repository:** https://github.com/kanteera-b-cyber/WebApplication

**Vercel URL:** `[กรอก URL ของระบบที่ deploy แล้ว ก่อนส่งงาน]`

### 7.1 การจัดการสไตล์ด้วย Tailwind CSS

หน้าตาของระบบสร้างด้วย Tailwind CSS v4 ทั้งหมด โดยกำหนด design token ครั้งเดียวด้วย `@theme` ในไฟล์ `src/app/globals.css` (เช่น `--color-brand`, `--color-ink`, `--color-line`) แล้วเรียกใช้เป็น utility ปกติ เช่น `bg-canvas`, `text-ink` และ `border-line`

ชุด utility ที่ใช้ซ้ำในหลายหน้าถูกรวบรวมไว้ที่ `src/features/operations/module-styles.ts` และ `src/features/operations/dashboard-styles.ts` เพื่อไม่ให้เขียน class ยาวๆ ซ้ำกัน 7 ไฟล์ **ไม่มี CSS ที่เขียนขึ้นเองสำหรับ component ใดเลย**

## 8. รายละเอียดการใช้ AI ในการพัฒนา

โจทย์อนุญาตให้ใช้ AI ช่วยในทุกขั้นตอน AI ถูกใช้ในงานนี้ดังนี้

| กิจกรรม | การใช้ AI | สิ่งที่มนุษย์ต้องตรวจสอบ |
| --- | --- | --- |
| วิเคราะห์ Requirement | อ่านโจทย์ แยกเป็นงานด้านฟังก์ชัน ฐานข้อมูล ความปลอดภัย UI CI และการ deploy พร้อมจัดทำตารางเทียบแต่ละข้อกำหนดกับโค้ดที่รองรับ | ยืนยันการตีความข้อกำหนดที่กำกวม เช่น กรณี Technician บันทึก Alarm ได้แม้โจทย์ไม่ได้ระบุ |
| ออกแบบ Database | ออกแบบตารางทั้ง 4 enum, foreign key, check constraint, unique index, trigger และชุด RLS policy | ตัดสินนโยบายการเก็บข้อมูลของเครื่องที่มีประวัติ และยืนยันกฎ RLS ตรงกับการแบ่งสิทธิ์ที่ต้องการ |
| เขียน Source Code | สร้างโครงสร้าง Next.js App Router, Supabase client, `proxy.ts`, โมดูล Machine / Alarm / Maintenance / Dashboard / Users / Reports / Settings และชั้น Tailwind | ตรวจทุกไฟล์ก่อน commit |
| สร้าง UI/UX | ออกแบบระบบภาพ, design token ผ่าน `@theme` และพฤติกรรม responsive ของทุกหน้า | ตัดสินว่าหน้าตาตรงตามความต้องการ และตรวจที่ขนาดจอจริง |
| เขียน SQL | เขียน migration 5 ไฟล์ รวมถึง `setup.sql` และ `seed.sql` | รันแต่ละไฟล์ใน Supabase SQL Editor เรียงตามลำดับและตรวจผลลัพธ์ |
| Debug และแก้ Error | วินิจฉัยปัญหา role ตอนสมัครสมาชิก, คอลัมน์ `is_archived` ที่หายไป, ข้อความแจ้งเตือนที่ทำให้เข้าใจผิด, พฤติกรรม `204 No Content` ของ RLS และ layout หน้า login ที่พังหลังแปลง CSS | ทำซ้ำพฤติกรรมที่พบและยืนยันการแก้ไขในระบบที่รันอยู่ |
| สร้าง Test | เขียนสคริปต์ทดสอบที่สมัครบัญชีจริงกับ Supabase และตรวจสิทธิ์ตาม Role, CRUD และ Input Validation จากนั้นลบข้อมูลทดสอบ | ตัดสินใจว่าจะเก็บสคริปต์เหล่านั้นเป็นชุดทดสอบถาวรหรือไม่ |
| ปรับปรุงและ Refactor | เปลี่ยน UI ทั้งหมดจาก CSS ที่เขียนเองไปเป็น Tailwind utility, รวบรวม utility ที่ซ้ำกันเป็นสองโมดูล และลบ stylesheet ที่ไม่ใช้แล้ว | ยืนยันว่าผลลัพธ์ที่แสดงยังตรงกับดีไซน์ที่ตั้งใจ |

### ผลการตรวจสอบที่ดำเนินการจริง

- **สิทธิ์ตาม Role** — สมัครบัญชี Admin และ Technician ใหม่ ยืนยันว่า trigger ให้ role ตามที่เลือก และยืนยันว่า Technician สร้างเครื่องจักรไม่ได้ (403), แก้ field ที่ล็อกของ Alarm ไม่ได้ (400) และเลื่อนสิทธิ์ตัวเองไม่ได้
- **CRUD** — ตรวจ 22 รายการ ครอบคลุมการสร้าง อ่าน แก้ไข archive restore และลบเครื่องจักร, การเปลี่ยนสถานะ Alarm ทั้ง 3 ค่า และการสร้าง แก้ไข และปิดงาน Maintenance
- **Input Validation** — ตรวจ 13 รายการ ยืนยันว่าช่องว่าง, Machine ID ซ้ำรวมถึงแบบต่างตัวพิมพ์, รูปแบบผิด, ความยาวผิด และค่า enum ที่ไม่มีในระบบ ถูกปฏิเสธทั้งหมด
- **การสแกนความลับ** — ค้นหา Service Role Key, secret key และรูปแบบ token ทั้ง repository รวมถึงไฟล์ bundle ที่จะส่งไปเบราว์เซอร์ ยืนยันว่าไม่มีไฟล์ `.env` ถูก track และโค้ดฝั่ง client อ่านเฉพาะตัวแปร `NEXT_PUBLIC_*`
- **เครื่องมือ** — `npm run lint`, `npm run typecheck` และ `npm run build` ผ่านทั้งหมด และ GitHub Actions รายงานผลผ่าน

### ข้อจำกัดที่พบจริง

- ชุดทดสอบอัตโนมัติที่กล่าวถึงข้างต้นเป็นสคริปต์ใช้ครั้งเดียวและไม่ได้ commit เป็นชุดทดสอบถาวร ดังนั้นยังไม่มีคำสั่ง `npm test`
- ปัญหา role ตอนสมัครสมาชิกเคยถูกวินิจฉัยผิดว่าเกิดจากฟังก์ชันในฐานข้อมูลเป็นเวอร์ชันเก่า สาเหตุที่แท้จริงคือมี migration ที่ยังไม่ถูกรัน การวินิจฉัยที่ถูกต้องมาจากการอ่านนิยามฟังก์ชันจริงในฐานข้อมูลผ่าน Management API
- การแปลง CSS ไปเป็น Tailwind ครั้งแรก commit ไปโดยหน้า login ยังมี layout ผิด ซึ่งพบได้จากการตรวจ HTML ที่เรนเดอร์ออกมา ไม่ได้พบจากการทดสอบอัตโนมัติ

### คำสั่งนี้ใช้อ้างอิง

นโยบายความปลอดภัย: ไม่มี Supabase Service Role Key หรือ secret ใดๆ อยู่ใน browser bundle, โค้ดต้นฉบับ, README หรือประวัติการ commit ของ repository เบราว์เซอร์ได้รับเฉพาะ URL ของโปรเจกต์ Supabase และ publishable anon key ซึ่งเป็นคีย์สาธารณะโดยการออกแบบและถูกป้องกันด้วย Row Level Security อีกชั้นหนึ่ง

รายละเอียดเพิ่มเติมอยู่ใน [`AI_USAGE_REPORT.md`](./AI_USAGE_REPORT.md)

## 9. รายการสิ่งที่ต้องส่ง

ดูรายละเอียดเพิ่มเติมได้ที่ [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md)

- [x] URL ของ GitHub repository
- [ ] URL ของระบบที่ deploy บน Vercel
- [x] สคีมาฐานข้อมูลบน Supabase — [migration 5 ไฟล์](./supabase/migrations) และ [เอกสารสคีมา](./DATABASE_SCHEMA.md)
- [x] มีบัญชีทดสอบทั้ง Admin และ Technician
- [ ] อัปเดต README ด้วย URL จริงของ Vercel
- [x] จับภาพหน้าจอระบบแล้ว
- [x] จัดทำรายงานสรุปการใช้ AI ในการพัฒนาแล้ว
