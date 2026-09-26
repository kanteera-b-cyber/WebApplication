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
| Requirement analysis | Read the assignment, split it into functional, database, security, UI, CI and deployment requirements, and produced a compliance table mapping each numbered requirement to the code that satisfies it. A later pass re-read the assignment against the finished system and produced a list of discrepancies, which is where most of the corrections in section 5 came from. | Confirm the interpretation of ambiguous requirements, notably that a Technician may create an Alarm even though the assignment only grants "change Alarm status". |
| Database design | Designed the four core tables, the `app_role` / `machine_status` / `alarm_status` enums, foreign keys, check constraints, the `lower(machine_id)` unique index, the actor triggers and the full RLS policy set. The bonus work added `audit_log` and `change_requests`, a `viewer` role and a `can_write()` helper. | Decide the retention policy for machines that have alarm history, and confirm the RLS rules match the intended role split. |
| Writing source code | Generated the Next.js App Router structure, the Supabase clients, `proxy.ts` route protection, the Machine / Alarm / Maintenance / Dashboard / Users / Reports / Settings modules, the Audit / History / Requests pages, and the Tailwind utility layer. | Review every file before committing. |
| UI/UX design | Drafted the visual system, the design tokens declared with Tailwind `@theme`, the light and dark palettes, and the responsive behaviour of every page. | Decide whether the visual style is acceptable, and confirm the layout at real viewport sizes. |
| Writing SQL | Wrote nine migrations, `seed.sql`, and a generator that concatenates them into a single `bootstrap.sql`. | Run the SQL in the Supabase editor in order and confirm the result. |
| Debugging and error fixing | Diagnosed the sign-up role defect, the missing `is_archived` column, the misleading "email rejected" message, the RLS `204 No Content` behaviour, a Tailwind conversion regression that broke the login grid, a chart whose bars collapsed to zero height, and a set of seed failures traced to a trigger overwriting a column it had been given. | Reproduce each reported behaviour and confirm the fix in the running application. |
| Creating tests | Wrote one-off scripts that signed up real accounts against the live Supabase project and asserted the role matrix, the CRUD matrix, the validation matrix and the bonus-feature matrix, then removed the test data. Later converted the durable parts into a committed `node --test` suite. | Decide whether the committed suite covers the behaviour that matters to you. |
| Refactoring | Migrated the entire UI from hand-written CSS to Tailwind utilities, factored repeated utility strings into shared modules, replaced roughly one hundred hard-coded colours with theme tokens so dark mode actually re-themes, and moved the Postgres error mapper into a shared module used by all three consoles. | Confirm the rendered result still matches the intended design. |

## 2. Verification actually performed

These were run against the live Supabase project or the deployed site, not only
inspected in code.

- **Role matrix** — signed up fresh Admin, Technician and Viewer accounts and confirmed the trigger assigns the requested role; confirmed a Technician cannot insert a machine, cannot edit locked alarm fields, and cannot promote their own profile.
- **CRUD matrix** — 22 checks covering Machine create/read/update/archive/restore/delete, Alarm create/read/update across `open` to `in_progress` to `closed`, and Maintenance create/read/update.
- **Validation matrix** — 13 checks confirming blank fields, duplicate Machine IDs (including case variants), malformed and out-of-range Machine IDs, and unknown enum values are all rejected.
- **Bonus matrix** — 20 checks covering Viewer read access with every write refused, the `waiting_part` status, automatic audit logging with no way to forge an entry, and a change request that a Technician can raise but only an Admin can approve.
- **Search and filter** — confirmed Machines apply three conditions (text, status, archived scope), Alarms and Maintenance apply two each, and Audit applies two.
- **Screenshot pass** — drove a real browser against the deployed Vercel URL and captured sixteen screenshots. Reading those images is what exposed three defects that reading the code had not: the alarm chart drew nothing, the machine health column showed a fabricated percentage, and the counters read "1 machines".
- **Install pass** — ran the generated `bootstrap.sql` three times inside a rolled-back transaction to confirm a fresh install and a repeat install both succeed.
- **Secret scan** — repository-wide search for Service Role Keys, secret keys and token patterns; confirmed no `.env.local` is tracked, that `.env.example` holds placeholders only, and that client code reads only `NEXT_PUBLIC_*` variables.
- **Toolchain** — `npm run lint`, `npm test` (36 assertions), `npm run typecheck` and `npm run build` all pass locally and in CI.

## 3. What the human must still do

- [x] Push the repository to GitHub and confirm the Actions workflow reports Passed.
- [x] Deploy to Vercel, add the two public environment variables, and verify the live URL.
- [x] Confirm the interface visually at desktop and mobile widths.
- [x] Capture the required system screenshots.
- [x] Insert the real Vercel URL into `README.md`.

Remaining before the project is shown outside the team:

- [ ] Revoke the Supabase management access token used during development, at
      <https://supabase.com/dashboard/account/tokens>.
- [ ] Decide whether the seeded demo data should stay or be cleared.

## 3a. Accounts and credentials

The deployment has no public account. Demo accounts for all three roles were
created so screenshots could be taken of each one, and their passwords were
published in the README so a reviewer could sign in. That combination was a real
exposure: anyone who cloned the repository could sign in as an Admin on a
deployed URL.

The accounts have been deleted, the credentials are out of the documentation, and
`supabase/make-admin.sql` replaces the old automatic promotion with a deliberate
one that names the account. The seeded data stays, so a new registration sees
machines and alarms immediately.

The reasoning is recorded here because it is a judgement, not a rule: promoting
the first account automatically would have been less friction, and on a student
project the risk is small. It was not done anyway, because a public deployment
means "first account registered" is not necessarily the owner.

## 4. Security statement

No Supabase Service Role Key or secret appears in the browser bundle, the source code,
the README or the repository history. The browser receives only the public Supabase
project URL and the publishable anon key, which are designed to be public and are
protected by Row Level Security. Authorization is enforced by RLS in the database in
addition to the checks in the interface and `proxy.ts`. The `audit_log` table has no
INSERT policy for anybody, so an audit entry cannot be created or edited from the
client. `.env.local` is excluded by `.gitignore`; the tracked `.env.example` contains
placeholders only.

## 5. Honest limitations

Things AI got wrong, and what checking the running system caught.

- **The automated checks were originally one-off scripts, not a suite.** `npm test` did
  not exist. A `node --test` suite covering validation, formatting and the machine query
  fallback now runs in CI, but it exercises pure logic only. The role, CRUD and bonus
  matrices are still one-off scripts because they need a real database.
- **The machine health column displayed a fabricated number.** `healthForStatus()`
  returned a fixed 96 / 71 / 48 / 20 depending only on the machine's status, so every
  running machine read exactly 96% under a heading called "Machine health". The code
  looked plausible and the column rendered correctly; only reading the rendered page
  revealed that the figure was invented. It is now the count of alarms still open on
  that machine, taken from the database.
- **The alarm chart drew nothing at all.** Each bar was sized with a percentage height
  inside a flex-sized column with no definite height, so every percentage resolved
  against `auto`. The component type-checked, linted and rendered an empty box. Found by
  looking at a screenshot.
- **Technicians were shown Admin-only Machine buttons.** Adding the `Viewer` role
  widened a shared `canWrite()` helper and a machine console was switched to use it,
  which contradicted the assignment and the README. The database still refused the
  writes, so the tests passed and the UI was still wrong.
- **Dark mode was broken while appearing to work.** The token layer flipped correctly,
  but eighteen `bg-white` surfaces and roughly ninety hard-coded hex colours did not, so
  the result was a near-black page with white cards. The mechanism was correct and the
  outcome was not.
- **`waiting_part` displayed as "In progress".** The status existed in the database and
  in the edit form but was missing from the table filter and the inline status dropdown.
  A record in that state rendered under the wrong label and touching the dropdown
  silently rewrote it.
- **`setup.sql` silently removed a feature.** It rewrote `handle_new_user()` with the
  older two-role version, so pasting it after the bonus migrations removed `viewer` from
  the system. It has been replaced by a generated `bootstrap.sql`.
- **`seed.sql` could not run the way the README said.** `set_record_actor()` filled
  `created_by` with `coalesce(auth.uid(), ...)` but `closed_by` with a bare `auth.uid()`.
  In the SQL editor there is no session, so the trigger erased the value the seed had
  supplied and the check constraint then rejected the insert. Found only by trying to
  apply the seed from a session-less context.
- **The sign-up defect was first misdiagnosed** as an outdated database function when
  the real cause was a migration that had not been applied. Corrected only after reading
  the live function definition over the management API.
- **The Tailwind migration was committed with a broken login grid**, found by inspecting
  the rendered markup rather than by a test.
- **One script of mine contained a mistyped project reference** and returned a
  confidently-worded 404 for a project that did not exist. It cost a long detour before
  a byte-level diff of the two files found the transposed characters.
- **Maximum lengths are enforced in the browser, not the database.** A direct PostgREST
  call can write a longer string than the form allows. The required-field and enum rules
  are enforced by constraints, but length rules are not.
- **The dashboard time range only filters the alarm queue**, not the metric cards or the
  donut, which always show everything. The README now says so.
- **Dates in seed data are relative to the moment the seed runs** (`now() - interval ...`),
  so a seeded project shows a fresh week of history whenever it is set up, and alarms on
  an archived machine show as "Unknown machine" in the dashboard queue.
