import Link from "next/link";
import { redirect } from "next/navigation";

import {
  TreatmentPlanForm,
  type TreatmentPlanFormValues,
} from "@/components/treatment-plans/treatment-plan-form";
import { TreatmentProgressForm } from "@/components/treatment-plans/treatment-progress-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Treatment Plans | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type TreatmentPlanRow = {
  id: string;
  client_id: string;
  title: string;
  summary: string | null;
  status: "draft" | "active" | "completed" | "archived";
  start_date: string;
  target_review_date: string | null;
  created_at: string;
};

type TreatmentGoalRow = {
  id: string;
  treatment_plan_id: string;
  title: string;
  description: string | null;
  interventions: string[];
  target_date: string | null;
  status: "planned" | "in_progress" | "achieved" | "paused";
  progress_percent: number;
  sort_order: number;
  last_progress_note: string | null;
  last_reviewed_at: string | null;
};

type ProgressEntryRow = {
  id: string;
  treatment_plan_id: string;
  goal_id: string;
  summary: string;
  barriers: string | null;
  next_steps: string | null;
  progress_percent: number;
  status: "planned" | "in_progress" | "achieved" | "paused";
  created_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

function mapPlanToFormValues(
  plan: TreatmentPlanRow,
  goals: TreatmentGoalRow[],
): TreatmentPlanFormValues {
  return {
    id: plan.id,
    clientId: plan.client_id,
    title: plan.title,
    summary: plan.summary ?? "",
    status: plan.status,
    startDate: plan.start_date,
    targetReviewDate: plan.target_review_date ?? "",
    goals: goals.map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      description: goal.description ?? "",
      interventions: goal.interventions.join("\n"),
      targetDate: goal.target_date ?? "",
      status: goal.status,
      progressPercent: goal.progress_percent,
    })),
  };
}

async function getPageData() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    return {
      practice: null,
      clients: [] as ClientRow[],
      treatmentPlans: [] as TreatmentPlanRow[],
      treatmentGoals: [] as TreatmentGoalRow[],
      progressEntries: [] as ProgressEntryRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: treatmentPlans, error: plansError },
    { data: treatmentGoals, error: goalsError },
    { data: progressEntries, error: progressError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("treatment_plans")
      .select(
        "id, client_id, title, summary, status, start_date, target_review_date, created_at",
      )
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("treatment_plan_goals")
      .select(
        "id, treatment_plan_id, title, description, interventions, target_date, status, progress_percent, sort_order, last_progress_note, last_reviewed_at",
      )
      .eq("practice_id", practice.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("treatment_plan_progress_entries")
      .select(
        "id, treatment_plan_id, goal_id, summary, barriers, next_steps, progress_percent, status, created_at",
      )
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
  ]);

  if (clientsError) {
    throw clientsError;
  }

  if (plansError) {
    throw plansError;
  }

  if (goalsError) {
    throw goalsError;
  }

  if (progressError) {
    throw progressError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    treatmentPlans: (treatmentPlans ?? []) as TreatmentPlanRow[],
    treatmentGoals: (treatmentGoals ?? []) as TreatmentGoalRow[],
    progressEntries: (progressEntries ?? []) as ProgressEntryRow[],
  };
}

function SummaryCards({
  practice,
  treatmentPlans,
  treatmentGoals,
}: {
  practice: PracticeContext;
  treatmentPlans: TreatmentPlanRow[];
  treatmentGoals: TreatmentGoalRow[];
}) {
  const activePlans = treatmentPlans.filter((plan) => plan.status === "active");
  const achievedGoals = treatmentGoals.filter((goal) => goal.status === "achieved");
  const averageProgress = treatmentGoals.length
    ? Math.round(
        treatmentGoals.reduce((total, goal) => total + goal.progress_percent, 0) /
          treatmentGoals.length,
      )
    : 0;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Active plans</p>
        <h2 className="mt-3 text-3xl font-semibold">{activePlans.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Total plans: {treatmentPlans.length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Goal progress</p>
        <h2 className="mt-3 text-3xl font-semibold">{averageProgress}%</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Achieved goals: {achievedGoals.length}
        </p>
      </article>
    </section>
  );
}

export default async function TreatmentPlansPage() {
  const { practice, clients, treatmentPlans, treatmentGoals, progressEntries } =
    await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before building treatment plans
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Treatment planning is practice-scoped and protected by the same RLS
            model as the clinical record. Set up the workspace on the dashboard
            first, then come back here.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open dashboard setup
          </Link>
        </section>
      </main>
    );
  }

  if (clients.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Client roster required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Add a client before creating treatment plans
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Every treatment plan attaches to a client profile. Create at least
            one client first, then return here to define goals, interventions,
            and clinical progress.
          </p>
          <Link
            href="/dashboard/clients"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open client management
          </Link>
        </section>
      </main>
    );
  }

  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
  }));
  const clientNameById = new Map(clientOptions.map((client) => [client.id, client.name]));
  const goalsByPlanId = new Map<string, TreatmentGoalRow[]>();
  const progressByGoalId = new Map<string, ProgressEntryRow[]>();

  for (const goal of treatmentGoals) {
    const planGoals = goalsByPlanId.get(goal.treatment_plan_id) ?? [];
    planGoals.push(goal);
    goalsByPlanId.set(goal.treatment_plan_id, planGoals);
  }

  for (const entry of progressEntries) {
    const goalEntries = progressByGoalId.get(entry.goal_id) ?? [];
    goalEntries.push(entry);
    progressByGoalId.set(entry.goal_id, goalEntries);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Treatment planning
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Treatment Plans
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create clinical plans, track goals, log interventions, and capture
            progress updates across active care inside {practice.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Back to dashboard
          </Link>
          <Link
            href="/dashboard/notes"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Open session notes
          </Link>
        </div>
      </header>

      <SummaryCards
        practice={practice}
        treatmentPlans={treatmentPlans}
        treatmentGoals={treatmentGoals}
      />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New plan
          </p>
          <h2 className="text-2xl font-semibold">Create a treatment plan</h2>
        </div>
        <div className="mt-6">
          <TreatmentPlanForm
            mode="create"
            clientOptions={clientOptions}
            initialValues={{
              clientId: clientOptions[0]?.id ?? "",
              title: "",
              summary: "",
              status: "draft",
              startDate: "",
              targetReviewDate: "",
              goals: [
                {
                  goalId: "",
                  title: "",
                  description: "",
                  interventions: "",
                  targetDate: "",
                  status: "planned",
                  progressPercent: 0,
                },
              ],
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Existing plans
          </p>
          <h2 className="text-2xl font-semibold">Manage goals and progress</h2>
        </div>

        {treatmentPlans.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No treatment plans yet. Create the first plan above.
          </article>
        ) : (
          treatmentPlans.map((plan) => {
            const goals = goalsByPlanId.get(plan.id) ?? [];

            return (
              <article
                key={plan.id}
                className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{plan.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {clientNameById.get(plan.client_id) ?? "Unknown client"} •{" "}
                      {titleCase(plan.status)} • Start {formatDate(plan.start_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review date: {formatDate(plan.target_review_date)}
                    </p>
                    {plan.summary ? (
                      <p className="max-w-3xl text-sm text-muted-foreground">
                        {plan.summary}
                      </p>
                    ) : null}
                  </div>
                </div>

                <section className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Goals
                    </p>
                    <h4 className="text-xl font-semibold">Current goal status</h4>
                  </div>
                  <div className="grid gap-4">
                    {goals.map((goal) => {
                      const recentEntries = (progressByGoalId.get(goal.id) ?? []).slice(
                        0,
                        2,
                      );

                      return (
                        <article
                          key={goal.id}
                          className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <h5 className="text-lg font-semibold">{goal.title}</h5>
                              <p className="text-sm text-muted-foreground">
                                {titleCase(goal.status)} • {goal.progress_percent}%
                                complete
                              </p>
                              {goal.description ? (
                                <p className="text-sm text-muted-foreground">
                                  {goal.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Target: {formatDate(goal.target_date)}
                            </div>
                          </div>

                          <progress
                            className="mt-4 h-3 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
                            value={goal.progress_percent}
                            max={100}
                          />

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                              <p className="text-sm font-medium text-foreground">
                                Interventions
                              </p>
                              {goal.interventions.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  No interventions listed yet.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                                  {goal.interventions.map((intervention) => (
                                    <li key={intervention}>{intervention}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                              <p className="text-sm font-medium text-foreground">
                                Latest clinical note
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {goal.last_progress_note ??
                                  "No progress note recorded yet."}
                              </p>
                              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                Last reviewed {formatDate(goal.last_reviewed_at)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-border/60 bg-card/80 p-4">
                            <p className="text-sm font-medium text-foreground">
                              Recent updates
                            </p>
                            {recentEntries.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                No progress entries yet.
                              </p>
                            ) : (
                              <div className="mt-3 space-y-3">
                                {recentEntries.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="rounded-xl border border-border/50 bg-background/80 p-3"
                                  >
                                    <p className="text-sm font-medium text-foreground">
                                      {titleCase(entry.status)} • {entry.progress_percent}%
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {entry.summary}
                                    </p>
                                    {entry.next_steps ? (
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        Next steps: {entry.next_steps}
                                      </p>
                                    ) : null}
                                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                      Logged {formatDateTime(entry.created_at)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Progress log
                    </p>
                    <h4 className="text-xl font-semibold">Record a progress update</h4>
                  </div>
                  <div className="mt-5">
                    {goals.length > 0 ? (
                      <TreatmentProgressForm
                        treatmentPlanId={plan.id}
                        goalOptions={goals.map((goal) => ({
                          id: goal.id,
                          title: goal.title,
                          status: goal.status,
                          progressPercent: goal.progress_percent,
                        }))}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add at least one goal before recording progress.
                      </p>
                    )}
                  </div>
                </section>

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Plan details
                    </p>
                    <h4 className="text-xl font-semibold">Edit treatment plan</h4>
                  </div>
                  <div className="mt-5">
                    <TreatmentPlanForm
                      mode="edit"
                      clientOptions={clientOptions}
                      initialValues={mapPlanToFormValues(plan, goals)}
                    />
                  </div>
                </section>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
