# AI Usage Report — ForgeOps

## Project

Alarm & Maintenance Management System for a factory automation environment.

## How AI was used

AI was used as an implementation assistant for:

1. Reading the assignment and converting it into functional, database, security, UI, CI and deployment requirements.
2. Drafting the Next.js App Router structure and responsive UI concepts.
3. Designing the Supabase tables, enums, foreign keys, actor triggers and Admin/Technician RLS policies.
4. Implementing Machine, Alarm, Maintenance, Dashboard and User Management workflows.
5. Adding client/server validation, duplicate Machine ID protection and error states.
6. Debugging TypeScript, React purity, Next.js 16 Proxy conventions and build issues.
7. Preparing the README, setup instructions, acceptance checklist and AI disclosure.

## Human verification required

Before submission, the developer must:

- run both Supabase migrations;
- create Admin and Technician test accounts;
- verify login/logout and route redirects;
- verify Admin-only Machine and profile operations;
- verify Technician alarm workflow and assigned maintenance operations;
- verify search, filters, dashboard totals and graph values;
- run `npm run lint` and `npm run build`;
- deploy to Vercel and verify the production URL.

## Security statement

No Supabase Service Role Key or secret is stored in the browser, source code or README. The browser receives only the public Supabase URL and anon key through environment variables. Authorization is enforced by Supabase RLS in addition to the UI.
