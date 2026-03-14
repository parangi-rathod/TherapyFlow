import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16 md:px-10">
      <section className="max-w-3xl space-y-6">
        <span className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
          Phase 0 foundation scaffold
        </span>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl font-semibold tracking-tight md:text-7xl">
          TherapyFlow
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
          An AI-first practice management workspace for therapists, clinics, and
          behavioral health teams.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Canonical stack</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Next.js 15 App Router, TypeScript strict mode, Tailwind CSS v3,
            Supabase, shadcn/ui, and `pnpm`.
          </p>
        </article>
        <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Current milestone</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Foundation setup is in progress. Auth, schema, and feature work land
            after the base scaffold is stable.
          </p>
        </article>
        <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Next path</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start with authentication and dashboard protection once the Supabase
            baseline is wired up.
          </p>
        </article>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Create workspace
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>

      <section
        id="foundation-files"
        className="rounded-[2rem] border bg-card/80 p-8 shadow-sm"
      >
        <h2 className="text-2xl font-semibold">Repository baseline</h2>
        <ul className="mt-6 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <li>App Router entrypoints under `app/`</li>
          <li>Supabase helpers under `lib/supabase/`</li>
          <li>Environment typing under `types/`</li>
          <li>Codex local agent stubs under `.codex/` and `.agents/`</li>
        </ul>
      </section>
    </main>
  );
}
