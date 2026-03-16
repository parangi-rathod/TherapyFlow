import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeDollarSign,
  BriefcaseMedical,
  Clock3,
  ReceiptText,
  TimerReset,
} from "lucide-react";

import { TimeEntryDeleteButton } from "@/components/time-tracking/time-entry-delete-button";
import {
  TimeEntryForm,
  type TimeEntryFormValues,
} from "@/components/time-tracking/time-entry-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Time Tracking | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type SessionRow = {
  id: string;
  client_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: "draft" | "completed" | "cancelled";
};

type TimeEntryRow = {
  id: string;
  client_id: string;
  session_id: string | null;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  is_billable: boolean;
  billing_status: "unbilled" | "ready" | "billed" | "non_billable";
  notes: string | null;
  created_at: string;
};

function toDatetimeLocal(value: string) {
  return value.slice(0, 16);
}

function formatFriendly(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

function mapTimeEntryToFormValues(entry: TimeEntryRow): TimeEntryFormValues {
  return {
    id: entry.id,
    clientId: entry.client_id,
    sessionId: entry.session_id ?? "",
    startsAt: toDatetimeLocal(entry.started_at),
    endsAt: toDatetimeLocal(entry.ended_at),
    isBillable: entry.is_billable,
    billingStatus: entry.billing_status,
    notes: entry.notes ?? "",
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
      sessions: [] as SessionRow[],
      entries: [] as TimeEntryRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: sessions, error: sessionsError },
    { data: entries, error: entriesError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("sessions")
      .select("id, client_id, started_at, ended_at, duration_minutes, status")
      .eq("practice_id", practice.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("time_entries")
      .select("id, client_id, session_id, started_at, ended_at, duration_minutes, is_billable, billing_status, notes, created_at")
      .eq("practice_id", practice.id)
      .order("started_at", { ascending: false }),
  ]);

  if (clientsError) throw clientsError;
  if (sessionsError) throw sessionsError;
  if (entriesError) throw entriesError;

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    sessions: (sessions ?? []) as SessionRow[],
    entries: (entries ?? []) as TimeEntryRow[],
  };
}

function SummaryCards({
  practice,
  entries,
}: {
  practice: PracticeContext;
  entries: TimeEntryRow[];
}) {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  const billableEntries = entries.filter((entry) => entry.is_billable);
  const billableMinutes = billableEntries.reduce(
    (sum, entry) => sum + entry.duration_minutes,
    0,
  );
  const readyToBill = entries.filter((entry) => entry.billing_status === "ready");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.8rem] border border-emerald-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(10,91,72,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Practice</p>
          <BriefcaseMedical className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-[1.8rem] border border-sky-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Tracked hours</p>
          <Clock3 className="h-5 w-5 text-sky-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">
          {formatHours(totalMinutes)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Billable hours: {formatHours(billableMinutes)}
        </p>
      </article>
      <article className="rounded-[1.8rem] border border-amber-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(217,119,6,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ready to bill</p>
          <ReceiptText className="h-5 w-5 text-amber-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">
          {readyToBill.length}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Entries prepared for invoice follow-up
        </p>
      </article>
    </section>
  );
}

export default async function TimeTrackingPage() {
  const { practice, clients, sessions, entries } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before tracking time
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Time tracking is practice-scoped and protected by RLS. Set up the
            workspace first, then come back here.
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
            Add a client before logging tracked time
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Time entries are tied to client records and can optionally attach to
            session records for billable care work.
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

  const clientMap = new Map(
    clients.map((client) => [client.id, `${client.first_name} ${client.last_name}`.trim()]),
  );
  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`.trim(),
  }));
  const sessionOptions = sessions.map((session) => ({
    id: session.id,
    clientId: session.client_id,
    label: `${clientMap.get(session.client_id) ?? "Unknown client"} • ${formatFriendly(session.started_at)}`,
    startsAt: toDatetimeLocal(session.started_at),
    endsAt: toDatetimeLocal(session.ended_at ?? session.started_at),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,rgba(254,215,170,0.7),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))] p-8 shadow-[0_30px_80px_rgba(180,83,9,0.12)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-200/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-800/70">
              Care operations and billing prep
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Time tracking
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Track session-linked work, capture billable effort, and prepare
              clean operational handoff into billing from one healthcare-focused workspace.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-amber-200 bg-white/85 px-4 py-2">
                Session-linked entries
              </span>
              <span className="rounded-full border border-sky-200 bg-white/85 px-4 py-2">
                Billable status control
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/85 px-4 py-2">
                Clinical workload tracking
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-amber-400 hover:text-amber-700"
            >
              Back to dashboard
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-amber-400 hover:text-amber-700"
            >
              Open billing
            </Link>
          </div>
        </div>
      </header>

      <SummaryCards practice={practice} entries={entries} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-amber-200/70 bg-white/92 p-8 shadow-[0_24px_70px_rgba(217,119,6,0.08)]">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-800/70">
              New time entry
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              Log clinical work
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Link tracked time to a session when one exists, or record other
              billable work directly against the client.
            </p>
          </div>
          <div className="mt-6">
            <TimeEntryForm
              mode="create"
              clientOptions={clientOptions}
              sessionOptions={sessionOptions}
              initialValues={{
                clientId: clientOptions[0]?.id ?? "",
                sessionId: "",
                startsAt: "",
                endsAt: "",
                isBillable: true,
                billingStatus: "unbilled",
                notes: "",
              }}
            />
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.96))] p-8 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
              Workflow guidance
            </p>
            <TimerReset className="h-5 w-5 text-sky-700" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            Billing handoff
          </h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium text-slate-900">Duration control</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Duration is computed from the start and end timestamps to avoid
                billing drift and manual math errors.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <BadgeDollarSign className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-medium text-slate-900">Status flow</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Use `ready` when the work is approved for invoicing, `billed`
                after it has been accounted for, and `non-billable` for admin or care support work.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Logged entries
          </p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Review tracked work
          </h2>
        </div>

        {entries.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed border-amber-200 bg-white/70 p-8 text-sm text-slate-600">
            No time entries yet. Use the form above to log the first tracked task.
          </article>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-950">
                      {clientMap.get(entry.client_id) ?? "Unknown client"}
                    </h3>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-800">
                      {entry.duration_minutes} min
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-800">
                      {titleCase(entry.billing_status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {formatFriendly(entry.started_at)} to {formatFriendly(entry.ended_at)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {entry.is_billable ? "Billable work" : "Non-billable work"}
                    {entry.session_id ? " • Linked to session" : " • Standalone entry"}
                  </p>
                </div>
                <TimeEntryDeleteButton
                  entryId={entry.id}
                  entryLabel={`${clientMap.get(entry.client_id) ?? "Unknown client"} on ${formatFriendly(entry.started_at)}`}
                />
              </div>

              <div className="mt-6">
                <TimeEntryForm
                  mode="edit"
                  clientOptions={clientOptions}
                  sessionOptions={sessionOptions}
                  initialValues={mapTimeEntryToFormValues(entry)}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
