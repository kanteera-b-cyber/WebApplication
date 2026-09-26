# Submission Checklist

Use this checklist before uploading the assignment.

## Required links

- [ ] GitHub repository URL added to the report
- [ ] Vercel production URL added to `README.md`
- [ ] Supabase project/schema shared or exported as required

## Database

- [ ] Run `001_initial_schema.sql` (or confirm it was already applied)
- [ ] Run `002_assignment_hardening.sql`
- [ ] Run `003_signup_role.sql`
- [ ] Create at least one Admin and one Technician account
- [ ] Set the first profile to `admin`
- [ ] Add representative machine, alarm and maintenance records

## Acceptance tests

- [ ] Anonymous access redirects to `/login`
- [ ] Signup creates a user and shows the email-confirmation state when required
- [ ] Signup role selection creates the selected Admin/Technician profile
- [ ] Admin can CRUD machines
- [ ] Technician can read machines but cannot mutate them
- [ ] Alarm can be created, edited and closed only with Cause + Action Taken
- [ ] Technician can update the allowed alarm workflow fields
- [ ] Maintenance can be created, edited and completed
- [ ] Search and status filters work
- [ ] Dashboard totals and status graph match Supabase data
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Evidence

- [ ] Dashboard screenshot captured
- [ ] Machines screenshot captured
- [ ] Alarms screenshot captured
- [ ] Maintenance screenshot captured
- [ ] `AI_USAGE_REPORT.md` attached
