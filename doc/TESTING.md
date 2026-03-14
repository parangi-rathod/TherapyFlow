# Testing Rules

## Build Verification
- Run `npm run build` before every commit
- Fix ALL type errors and build warnings before committing
- Build catches: TypeScript errors, import issues, missing exports, unused variables

## Manual Testing Checklist
- Desktop (≥1024px): sidebar visible, bottom tabs hidden, FAB visible
- Mobile (<1024px): sidebar hidden, bottom tabs visible, FAB hidden
- Theme toggle: light/dark mode works in all views
- Auth flow: login → dashboard, logout → login redirect
- Onboarding: new user → onboarding wizard → dashboard

## Known Type Issues
- Supabase FK joins return arrays → use `as any` cast (Rule 9)
- Recharts Tooltip formatter → use `(v) => fn(Number(v))` (Rule 11)
- shadcn base-nova → no `asChild` prop (Rule 10)

## Testing Strategy (Future)
- No test framework set up yet
- When added: prefer integration tests over unit tests for Supabase queries
- Component tests: focus on interactive flows (forms, inline editing, filters)
- E2E: auth flow, onboarding, add transaction, view dashboard
