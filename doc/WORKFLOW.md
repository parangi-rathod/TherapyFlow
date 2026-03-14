# Development Workflow

## Investigation Before Implementation (MANDATORY)
1. Read all relevant files first
2. Trace the complete code flow from actual code
3. Write a plan listing every change needed
4. Only then implement
No assumptions. No try-error-fix loops.

## Standard Development Cycle
1. Read the step/phase spec from `docs/PROJECT-PLAN.md`
2. Identify all files to create/modify
3. Read existing files that will be affected
4. Implement changes (create files, edit existing)
5. Run `npm run build` — fix any errors
6. Commit with proper format: `type: short description`
7. Update CLAUDE.md progress section
8. Update `.claude/` docs if new patterns/bugs discovered

## File Creation Order (for new features)
1. Types/interfaces (in `src/types/index.ts` or colocated)
2. Lib utilities (data fetching, helpers)
3. UI components (client components with interactivity)
4. Page components (server components that fetch + render)
5. Migrations (if database changes needed)

## Supabase Migration Workflow
1. Write SQL migration
2. Apply via `mcp__supabase__apply_migration` (remote)
3. Save migration file locally in `supabase/migrations/`
4. Verify with `mcp__supabase__list_migrations`

## When Something Breaks
1. Read the exact error message
2. Find the file and line causing the error
3. Understand WHY it's failing (don't guess)
4. Apply the minimal fix
5. Rebuild to verify
6. Check if the same pattern exists elsewhere and fix all occurrences

## Updating Documentation
After completing a phase or major feature:
- Update `Current Phase` section in CLAUDE.md
- Update progress checklist
- Add new key files/patterns to CLAUDE.md
- Update `.claude/memory/` if new bugs, decisions, or patterns discovered
- Update `.claude/rules/` if new rules emerged
