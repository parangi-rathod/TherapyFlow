# Security Rules

## Supabase RLS (Row Level Security)
- Every table enforces `auth.uid() = user_id` policy
- Never bypass RLS with service role key in client code
- All queries run through authenticated Supabase clients (server or browser)
- `SECURITY DEFINER` functions (like `seed_user_defaults`) are the exception — they run with elevated privileges but are explicitly designed for it

## Authentication
- Supabase Auth with email/password + email verification
- Server-side auth check: `supabase.auth.getUser()` — if no user, redirect to `/login`
- Middleware (`proxy.ts`): handles session refresh + route protection
- Protected routes: all `(dashboard)/*` routes require authentication

## Client vs Server
- `src/lib/supabase/server.ts` — Server client (uses cookies, SSR-safe)
- `src/lib/supabase/client.ts` — Browser client (client-side mutations)
- Never expose server-only logic in client components
- Never use service role key in any client-accessible code

## Data Access Patterns
- Server components fetch data → pass as props to client components
- Client components only mutate (insert/update/delete) via browser Supabase client
- Always fetch fresh data — never rely on stale references

## Sensitive Files
- `.env.local` — Supabase URL, anon key, service role key
- Never commit `.env*` files
- Supabase anon key is safe for client-side (RLS protects data)
- Service role key must NEVER appear in client code
