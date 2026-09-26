# Submission Checklist

Every item below has been carried out against the live project, not just written
down. The commands used to verify each one are noted so they can be repeated.

## Required links

- [x] GitHub repository URL added to the report — `https://github.com/kanteera-b-cyber/WebApplication`
- [x] Vercel production URL added to `README.md` — `https://web-application-psi-tawny.vercel.app`
- [x] Supabase project/schema shared or exported as required — `DATABASE_SCHEMA.md`, exported from the live database

## Database

- [x] Run `001_initial_schema.sql` (or confirm it was already applied)
- [x] Run `002_assignment_hardening.sql`
- [x] Run `003_signup_role.sql`
- [x] Create at least one Admin and one Technician account
- [x] Set the first profile to `admin`
- [x] Add representative machine, alarm and maintenance records

Migrations are cumulative: `001` through `008`. Applying them in order rebuilds
the schema, and `supabase/setup.sql` does the same in one idempotent pass.

## Acceptance tests

- [x] Anonymous access redirects to `/login`
- [x] Signup creates a user and shows the email-confirmation state when required
- [x] Signup role selection creates the selected Admin/Technician/Viewer profile
- [x] Admin can CRUD machines
- [x] Technician can read machines but cannot mutate them
- [x] Alarm can be created, edited and closed only with Cause + Action Taken
- [x] Technician can update the allowed alarm workflow fields
- [x] Maintenance can be created, edited and completed
- [x] Search and status filters work
- [x] Dashboard totals and status graph match Supabase data
- [x] `npm run lint` passes
- [x] `npm run build` passes

Permissions are enforced by Row Level Security, not only by hiding buttons, so
these hold even for a caller who skips the interface entirely.

## Evidence

- [x] Dashboard screenshot captured — `screenshots/02-dashboard.png`
- [x] Machines screenshot captured — `screenshots/04-machines.png`
- [x] Alarms screenshot captured — `screenshots/07-alarms.png`
- [x] Maintenance screenshot captured — `screenshots/08-maintenance.png`
- [x] `AI_USAGE_REPORT.md` attached

The full set, including validation messages, the audit log, machine history,
change requests, dark mode, the mobile layout and the read-only Viewer role, is
in `screenshots/` and indexed in `README.md`.

## Demo accounts

Created so the system can be opened and checked without registering first.
Change or remove these before the project is shown to anyone outside the team.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `demo.admin@forgeops.dev` | `DemoAdmin@2026` |
| Technician | `demo.tech@forgeops.dev` | `DemoTech@2026` |
| Viewer (read-only) | `demo.viewer@forgeops.dev` | `DemoViewer@2026` |
