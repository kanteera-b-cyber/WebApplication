# AI Usage Report — ForgeOps

Alarm & Maintenance Management System for a factory automation environment.
Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase and GitHub Actions.

The assignment permits AI assistance at every stage. This report states where AI was
used, what a human had to verify, and which parts of the system a human is still
responsible for.

## 1. Where AI was used

Mapped against the activities the assignment lists as AI-assisted.

| Assignment activity | How AI was used | Human responsibility |
| --- | --- | --- |
| Requirement analysis | Read the assignment, split it into functional, database, security, UI, CI and deployment requirements, and produced a compliance table mapping each numbered requirement to the code that satisfies it. | Confirm the interpretation of ambiguous requirements, notably that a Technician may create an Alarm even though the assignment only grants "change Alarm status". |
| Database design | Designed the four tables, the `app_role` / `machine_status` / `alarm_status` enums, foreign keys, check constraints, the `lower(machine_id)` unique index, the actor triggers and the full RLS policy set. | Decide the retention policy for machines that have alarm history, and confirm the RLS rules match the intended role split. |
| Writing source code | Generated the Next.js App Router structure, the Supabase clients, `proxy.ts` route protection, the Machine / Alarm / Maintenance / Dashboard / Users / Reports / Settings modules, and the Tailwind utility layer. | Review every file before committing. |
| UI/UX design | Drafted the visual system, the design tokens declared with Tailwind `@theme`, and the responsive behaviour of every page. | Decide whether the visual style is acceptable, and confirm the layout at real viewport sizes. |
| Writing SQL | Wrote five migrations plus `setup.sql` and `seed.sql`. | Run each migration in the Supabase SQL editor in order and confirm the result. |
| Debugging and error fixing | Diagnosed the sign-up role defect, the missing `is_archived` column, the misleading "email rejected" message, the RLS `204 No Content` behaviour and a Tailwind conversion regression that broke the login grid. | Reproduce each reported behaviour and confirm the fix in the running application. |
| Creating tests | Wrote throwaway scripts that signed up real accounts against the live Supabase project and asserted the role matrix, the CRUD matrix and the validation matrix, then removed the test data. | Decide whether to keep any of these as permanent automated tests. |
| Refactoring | Migrated the entire UI from hand-written CSS to Tailwind utilities, factored repeated utility strings into two shared modules, and removed a stale stylesheet. | Confirm the rendered result still matches the intended design. |

## 2. Verification actually performed

These were run against the live Supabase project, not only inspected in code.

- **Role matrix** — signed up fresh Admin and Technician accounts and confirmed the trigger assigns the requested role; confirmed a Technician cannot insert a machine (403), cannot edit locked alarm fields (400), and cannot promote their own profile.
- **CRUD matrix** — 22 checks covering Machine create/read/update/archive/restore/delete, Alarm create/read/update across `open` to `in_progress` to `closed`, and Maintenance create/read/update.
- **Validation matrix** — 13 checks confirming blank fields, duplicate Machine IDs (including case variants), malformed and out-of-range Machine IDs, and unknown enum values are all rejected.
- **Search and filter** — confirmed Machines apply three conditions (text, status, archived scope) and Alarms and Maintenance apply two each.
- **Secret scan** — repository-wide search for Service Role Keys, secret keys and token patterns; confirmed no `.env` file is tracked and that client code reads only `NEXT_PUBLIC_*` variables.
- **Toolchain** — `npm run lint`, `npm run typecheck` and `npm run build` all pass.

## 3. What the human must still do

- [ ] Push the repository to GitHub and confirm the Actions workflow reports Passed.
- [ ] Deploy to Vercel, add the two public environment variables, and verify the live URL.
- [ ] Confirm the interface visually at desktop and mobile widths.
- [ ] Capture the required system screenshots.
- [ ] Insert the real Vercel URL into `README.md`.

## 4. Security statement

No Supabase Service Role Key or secret appears in the browser bundle, the source code,
the README or the repository history. The browser receives only the public Supabase
project URL and the publishable anon key, which are designed to be public and are
protected by Row Level Security. Authorization is enforced by RLS in the database in
addition to the checks in the interface and `proxy.ts`. The `.env.local` file is excluded
by `.gitignore` and no environment file is tracked in git.

## 5. Honest limitations

- The automated checks described in section 2 were run as one-off scripts and are not
  committed as a permanent test suite, so `npm test` does not exist.
- The sign-up defect described above was originally misdiagnosed as an outdated
  database function. The real cause was a migration that had not been applied. The
  diagnosis was corrected only after reading the live function definition over the
  management API.
- The Tailwind migration was committed with a broken login grid, which was found by
  inspecting the rendered markup rather than by a test.
