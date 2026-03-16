# TASKS

Status legend:
- `[ ]` todo
- `[~]` in progress
- `[x]` done
- `[!]` blocked

Current phase: Phase 2 - Core MVP features

## Completed

- [x] 2026-03-14 10:47 Coordinator bootstrap: scanned repository, read required `/doc` files, and summarized project state.
- [x] 2026-03-14 10:47 Documentation recovery: recreated the missing task ledger and normalized the backlog against canonical architecture rules in `/doc/AGENTS.md`.

## Backlog

### Phase 0 - Foundation setup

- [x] 2026-03-14 10:55 Initialize the Next.js 15 project scaffold with `pnpm`, TypeScript strict mode, App Router, and the canonical folder structure from `/doc/AGENTS.md`.
- [x] 2026-03-14 10:55 Add core project configuration: `package.json`, `tsconfig.json`, `next.config.ts`, ESLint, Tailwind CSS v3, PostCSS, path alias `@/`, and `.gitignore`.
- [x] 2026-03-14 10:55 Establish shared app foundation: `app/layout.tsx`, `app/page.tsx`, metadata, global styles, `lib/utils.ts`, and a placeholder shadcn-compatible UI structure.
- [x] 2026-03-14 10:55 Set up Supabase integration baseline: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, root `middleware.ts`, `.env.example`, and `types/env.d.ts`.
- [x] 2026-03-14 10:55 Create project-level Codex multi-agent config: `.codex/config.toml` and `.codex/agents/*.toml`.
- [x] 2026-03-14 10:55 Add project-local skill stubs under `.agents/skills/` for `frontend-design`, `db-migration`, `api-endpoint`, `agent-browser`, and `pr-review`.

### Phase 1 - Data model and auth

- [x] 2026-03-14 10:55 Define the MVP schema for users, clients, appointments, sessions, notes, documents, billing, messages, and reminders in `/doc/SCHEMA.md`.
- [x] 2026-03-14 10:55 Author the first Supabase migration for core MVP tables and enable RLS on every table.
- [x] 2026-03-14 10:55 Implement Supabase Auth flows for sign up, sign in, sign out, and protected dashboard routing.
- [x] 2026-03-14 10:55 Add auth pages under `app/(auth)/` and protected layout handling under `app/(dashboard)/layout.tsx`.

### Phase 2 - Core MVP features

- [x] 2026-03-14 11:45 Build client management CRUD flows.
- [x] 2026-03-14 12:06 Build appointment scheduling UI and supporting data model.
- [x] 2026-03-14 12:39 Build session note creation and viewing flows.
- [x] 2026-03-14 14:01 Build secure document upload and listing flows. `must-have` `low`
- [x] 2026-03-14 15:02 Build automated email and SMS appointment reminders with configurable timing and messaging. `important` `low`
- [x] 2026-03-14 16:05 Build treatment planning with goals, interventions, and progress tracking. `must-have` `medium`
- [x] 2026-03-14 16:17 Build basic billing and payment tracking flows. `must-have` `medium`
- [x] 2026-03-14 16:39 Build intake form creation, client completion, and submission review flows. `must-have` `medium`
- [x] 2026-03-14 17:55 Build secure therapist-client messaging flows. `important` `medium`
- [x] 2026-03-14 18:20 Build time tracking tied to sessions and billable work. `must-have` `low`

### Phase 3 - Practice operations and reporting

- [x] 2026-03-14 18:55 Build multi-user practice access with role-based staff management. `important` `medium`
- [ ] Build financial reporting dashboards for revenue, balances, and analytics. `important` `medium`
- [ ] Build calendar integration for Google Calendar, Outlook, and external calendar sync. `important` `low`
- [ ] Build payment processing for card and ACH with compliance-aware flow boundaries. `must-have` `high`
- [ ] Build backup and data export workflows for client data portability. `must-have` `medium`
- [ ] Build audit trail logging for system access and critical data changes. `must-have` `medium`

### Phase 4 - Scheduling and care program extensions

- [ ] Build group session scheduling and participant management. `important` `medium`
- [ ] Build waitlist management with cancelled-slot fill workflow. `nice-to-have` `low`
- [ ] Build outcome measurement tools with assessments and progress tracking. `important` `medium`

### Phase 5 - Quality gates

- [ ] Configure Vitest and add initial coverage for validations, utilities, and server-side logic.
- [ ] Configure Playwright and add baseline E2E coverage for auth and the first critical journey.
- [ ] Add pre-commit quality commands for lint, typecheck, and tests.

### Phase 6 - AI features and hardening

- [ ] Define the first AI-assisted session note workflow.
- [ ] Define the AI transcription ingestion path.
- [ ] Build the first predictive no-show detection workflow. `important` `medium`
- [ ] Define risk detection review and escalation workflow for notes and transcripts. `important` `medium`
- [ ] Build the first mobile application delivery plan and scope boundary. `important` `high`
- [ ] Document no-show prediction and risk detection as post-MVP or stretch work unless hackathon scope changes.

## Next unfinished task

- Build financial reporting dashboards for revenue, balances, and analytics.
