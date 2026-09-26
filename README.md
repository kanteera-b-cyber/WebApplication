# ForgeOps — Alarm & Maintenance Management System

Web application for factory automation teams to manage machine master data, alarms, maintenance work and operational status. The project follows the Programming in Automation Systems assignment requirements.

## 1. Objectives

- Provide a single operations workspace for production machines.
- Record, investigate and close machine alarms.
- Record maintenance work and completion status.
- Show live machine, alarm and maintenance summaries.
- Enforce Admin and Technician permissions at both the UI and Supabase Row Level Security (RLS) layers.
- Use contemporary web technologies with Supabase, Next.js, Tailwind CSS, GitHub Actions and Vercel.

## 2. Technology

- Next.js 16 App Router + TypeScript
- React 19
- Tailwind CSS 4
- Supabase Authentication, PostgreSQL and RLS
- GitHub Actions CI
- Vercel deployment
- AI-assisted requirement analysis, code generation, debugging and documentation

## 3. Main features

### Authentication and roles

- Email/password login and logout through Supabase Authentication.
- New users can sign up from the login screen and choose `Technician` or `Admin`; the selected role is validated by the database trigger.
- `Admin` and `Technician` roles stored in `public.profiles`.
- Admin: full Machine CRUD, profile/role management, alarm and maintenance management.
- Technician: read machines and dashboard, create alarms, update alarm workflow fields, and manage assigned maintenance records.
- The Next.js `proxy.ts` protects application routes, while PostgreSQL RLS remains the final authorization boundary.

#### Role capability matrix

Every Technician capability required by the assignment, and the layer that enforces it:

| Capability | UI | RLS policy | Extra database guard |
| --- | --- | --- | --- |
| View machine data | `machine-console.tsx` renders read-only, shows "View only" | `authenticated users read machines` | — |
| Cannot add / edit / archive machines | `canManage = role === "admin"` hides every control | `admins manage machines` | — |
| Create maintenance | Technician is forced to own the record | `admins or technicians create maintenance` | `set_record_actor()` sets `created_by`/`completed_at` |
| Edit maintenance | `canEditRecord()` allows own records | `admins or assigned technicians update maintenance` | `set_record_actor()` forces `technician_id = auth.uid()` |
| Change alarm status | `canManageDetails` limits the form to status / cause / action | `technicians update alarm workflow` | `set_record_actor()` raises on any other field change |
| View dashboard | No role gate | `authenticated users read alarms` / `authenticated users read maintenance` | — |
| Cannot escalate to Admin | `/users` is Admin-only and redirects otherwise | `admins manage profiles` | — |

Two deliberate decisions worth noting for review:

- The assignment lists *change Alarm status* for Technician and *manage Alarm* for Admin. This build additionally lets a Technician **create** an alarm, because in a real plant the technician on the floor is normally the one who records it. The permission is `authenticated users create alarms`, and `created_by` is always forced to the signed-in user. Removing it is a one-line policy change if stricter separation is required.
- A Technician may only edit maintenance records assigned to them, enforced by the `admins or assigned technicians update maintenance` policy. A Technician can never edit another technician's work.

Note on RLS feedback: when a write is rejected by row-level security, PostgREST filters the row out and returns `204 No Content` rather than an error, because zero rows matched. The consoles detect this and raise a permission error instead of reporting a false success (see `changeStatus` in `alarm-console.tsx` and `destroy` in `machine-console.tsx`).

### Machine Master

Fields: `Machine ID`, `Machine Name`, `Machine Type`, `Location`, `Status`.

Statuses: `Running`, `Stop`, `Alarm`, `Maintenance`.

Admin can create, read, update and delete machines. Machine IDs are checked in the browser and with a case-insensitive unique database index.

### Alarm Record

Fields: Machine, Alarm Code, Description, Date/Time, Cause, Action Taken and Status.

Statuses: `Open`, `In Progress`, `Closed`.

An alarm must have both Cause and Action Taken before it can be closed. Admins can edit all fields; Technicians can update the alarm workflow fields allowed by the database policy.

### Maintenance Record

Fields: Machine, Technician, Problem, Action Taken, Started At, Status and completion time.

Statuses: `In Progress`, `Completed`.

Technicians are selected from `profiles` and the database trigger ensures a Technician can only own their own maintenance work.

### Search, filter and dashboard

- Text search and status filters are available on Machines, Alarms and Maintenance.
- Dashboard totals are loaded from the authenticated `/api/dashboard` route.
- Machine status donut, alarm queue, machine health list and maintenance completion summary are data-driven.
- Dashboard time range supports the last 24 hours and last 7 days for the alarm queue.
- Reports page exports the current machine, alarm and maintenance records as CSV.

## 4. Database structure

Run the migrations in Supabase SQL Editor in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_assignment_hardening.sql`
3. `supabase/migrations/003_signup_role.sql`
4. `supabase/migrations/004_machine_soft_delete.sql`
5. `supabase/migrations/005_signup_role_enforcement.sql`

Optional local demo data is available in `supabase/seed.sql`. Run it after creating the first Admin profile. If `001_initial_schema.sql` was already applied before this update, run only `002_assignment_hardening.sql`.

Note that `003_signup_role.sql` only replaces the `public.handle_new_user()` function; the `on_auth_user_created` trigger itself is created by `001_initial_schema.sql`. `005_signup_role_enforcement.sql` re-applies the function *and* re-creates the trigger, so it repairs a project where the deployed function was an older revision that hardcoded the `technician` role. See [Sign-up always returns Technician](#sign-up-always-returns-technician).

Tables and relationships:

- `profiles(id, display_name, role)` — one profile per Supabase Auth user.
- `machines(id, machine_id, machine_name, machine_type, location, status)`.
- `alarms(id, machine_id, alarm_code, description, occurred_at, cause, action_taken, status, created_by, closed_by, closed_at)`.
- `maintenance_records(id, machine_id, technician_id, problem, action_taken, started_at, completed_at, status, created_by)`.

`alarms.machine_id` and `maintenance_records.machine_id` reference `machines.id`. `technician_id`, `created_by` and `closed_by` reference `profiles.id`. RLS is enabled on all application tables.

## 5. Local setup

### Requirements

- Node.js 20+
- A Supabase project
- A Supabase user for each role

### Install and configure

```bash
npm install
cp .env.example .env.local
```

Set these values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never put a Supabase Service Role Key in a `NEXT_PUBLIC_*` variable or in client-side code.

### Allow sign-up without email confirmation

Supabase Dashboard → **Authentication → Sign In / Providers → Email** → turn off **Confirm email**.

Without this step the sign-up form cannot complete on a new project, because Supabase's built-in mail service has a small hourly quota and the confirmation email is never delivered. See [Login troubleshooting](#login-troubleshooting).

### Sign-up always returns Technician

**Symptom:** selecting **Admin** on the sign-up form creates the account, but the app then shows **Technician** and the Admin-only controls stay hidden.

**Confirm it** with this query in the Supabase SQL Editor. `requested_role` says `admin` while `role` says `technician`:

```sql
select u.email, p.role, u.raw_user_meta_data ->> 'role' as requested_role
from auth.users u
join public.profiles p on p.id = u.id
order by u.created_at desc;
```

**Cause:** the deployed `public.handle_new_user()` is an older revision that hardcodes `'technician'` and never reads the role from `raw_user_meta_data`. Migration `003` only replaces that function and assumes the trigger was wired up by `001`, so the fix is easy to miss.

**Fix:** run `supabase/migrations/005_signup_role_enforcement.sql` in the SQL Editor, then sign up again. It is idempotent, so re-running it is safe.

**Promote an existing account.** A profile created before the fix keeps its old role, and an account created directly in the Supabase dashboard always becomes Technician because the dashboard sends no role metadata. Run this with the user's UUID from Authentication → Users:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH-USER-UUID-HERE';
```

### Create the first Admin

Sign up from `http://localhost:3000/login` with the **Admin** role, then promote the profile in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH-USER-UUID-HERE';
```

The UUID is shown in Supabase → Authentication → Users, or in the app under **Users**. Every later sign-up is given the role selected on the signup form by the `on_auth_user_created` trigger.

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000/login`.

### Login troubleshooting

The most common cause of a blocked sign-up is the **Confirm email** setting. When it is enabled, Supabase does not return a session after sign-up and instead requires a confirmation email. On a fresh project Supabase uses a built-in mail service with a very small hourly quota, so the email is never sent and the account can never be used.

Supabase Dashboard → **Authentication → Sign In / Providers → Email**, then either:

- turn off **Confirm email** so sign-up returns a session immediately (recommended for local development and assignment demos), or
- configure a real SMTP provider under **Authentication → Emails** and leave confirmation enabled (recommended for production).

Verify the current project state at any time:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

`mailer_autoconfirm: true` means sign-up returns a session with no email step. `mailer_autoconfirm: false` means confirmation is required.

Other checks:

- Create the user under Supabase Authentication → Users.
- Confirm the email address before signing in when Email Confirmation is enabled.
- Restart the dev server after changing `.env.local`.
- If the browser returns to `/login` after a successful sign-in, clear the site cookies for `localhost` and try again.
- Never share a password or Supabase key in an error report.

## 6. Verification

```bash
npm run lint
npm run build
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same checks on pushes to `main`/`master` and pull requests.

Manual acceptance checks:

- Anonymous users are redirected to `/login` from every application module.
- Technician cannot see or successfully mutate Admin-only machine controls.
- A newly created Machine can be edited and deleted using the database-generated ID.
- An Alarm can be created, edited, assigned a cause/action and closed.
- A Maintenance record can be created by a Technician, updated and completed.
- Search and status filters return the expected rows.
- Dashboard counts and machine/alarm views come from Supabase.

## 7. Deployment

1. Push this project to a GitHub repository.
2. Import the repository into Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables.
4. Run all four Supabase migrations before testing the deployment.
5. Verify `/login`, `/dashboard`, `/machines`, `/alarms` and `/maintenance` on the Vercel URL.

**GitHub repository:** https://github.com/kanteera-b-cyber/WebApplication

**Vercel URL:** `[add the production Vercel URL here before submission]`

### Styling with Tailwind CSS

The interface is built entirely with Tailwind CSS v4. Design tokens are declared once with `@theme` in `src/app/globals.css` (for example `--color-brand`, `--color-ink`, `--color-line`) and are consumed as ordinary utilities such as `bg-canvas`, `text-ink` and `border-line`. Utility strings that are reused across the module pages are collected in `src/features/operations/module-styles.ts` and `src/features/operations/dashboard-styles.ts` to avoid repeating the same long class list in seven files. There is no hand-written component CSS.

## 8. AI usage disclosure

AI was used to:

- summarize the assignment requirements into functional and database tasks;
- design the initial table relationships, roles and RLS policies;
- draft the responsive UI and CRUD forms;
- identify route-protection, validation and foreign-key issues;
- assist with TypeScript, lint, build and debugging work;
- improve README and deployment documentation.

The developer verified the generated code, ran lint/build, applied Supabase migrations, and tested the acceptance flows with real Admin and Technician accounts before submission. No Service Role Key or other secret is included in the repository.

## 9. Submission checklist

See [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md) and [`AI_USAGE_REPORT.md`](./AI_USAGE_REPORT.md).

- [x] GitHub repository URL
- [ ] Vercel deployment URL
- [x] Supabase migrations executed
- [ ] Admin and Technician test accounts created
- [ ] README updated with the real Vercel URL
- [ ] Dashboard screenshot captured
- [ ] Final AI usage report attached
