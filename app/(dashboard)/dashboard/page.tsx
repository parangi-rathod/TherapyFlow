import { redirect } from "next/navigation";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { WorkspaceSetupForm } from "@/components/dashboard/workspace-setup-form";
import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard | TherapyFlow",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);
  const fullName = user.user_metadata.full_name?.toString().trim() || "My Practice";
  const suggestedSlug =
    fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "my-practice";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Protected workspace
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email ?? "unknown user"}.
          </p>
        </div>
        <LogoutButton />
      </header>

      {practice ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <p className="mt-3 text-sm text-muted-foreground">{practice.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Current role: {practice.role}
            </p>
          </article>
          <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Client records</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Start intake, edit profiles, and manage the current practice from
              the client workspace.
            </p>
          </article>
          <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Schema baseline</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Hosted Supabase is connected and the MVP migration is live.
            </p>
          </article>
        </section>
      ) : (
        <WorkspaceSetupForm
          suggestedName={fullName}
          suggestedSlug={suggestedSlug}
        />
      )}

      {practice ? (
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Workspace modules
            </p>
            <h2 className="text-2xl font-semibold">Continue into active features</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              The workspace context is ready. Move between client management and
              appointment scheduling from here.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Go to clients
            </Link>
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
            >
              Go to appointments
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
