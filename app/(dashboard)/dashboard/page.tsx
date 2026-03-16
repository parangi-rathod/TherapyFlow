import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BellRing,
  CalendarHeart,
  ClipboardList,
  FileHeart,
  FolderHeart,
  HeartPulse,
  MessageSquareHeart,
  ReceiptText,
  Stethoscope,
  TimerReset,
  UserCog,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { WorkspaceSetupForm } from "@/components/dashboard/workspace-setup-form";
import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard | TherapyFlow",
};

type DashboardCounts = {
  clientCount: number;
  upcomingAppointments: number;
  pendingReminders: number;
  activePlans: number;
  draftIntakeForms: number;
  outstandingInvoices: number;
};

async function getDashboardCounts(practiceId: string) {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const [
    { count: clientCount },
    { count: upcomingAppointments },
    { count: pendingReminders },
    { count: activePlans },
    { count: draftIntakeForms },
    { count: outstandingInvoices },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId)
      .gte("starts_at", now)
      .in("status", ["scheduled", "confirmed"]),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId)
      .eq("status", "pending")
      .eq("channel", "email"),
    supabase
      .from("treatment_plans")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId)
      .eq("status", "active"),
    supabase
      .from("intake_forms")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId)
      .eq("status", "draft"),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practiceId)
      .in("status", ["sent", "partial"]),
  ]);

  return {
    clientCount: clientCount ?? 0,
    upcomingAppointments: upcomingAppointments ?? 0,
    pendingReminders: pendingReminders ?? 0,
    activePlans: activePlans ?? 0,
    draftIntakeForms: draftIntakeForms ?? 0,
    outstandingInvoices: outstandingInvoices ?? 0,
  } satisfies DashboardCounts;
}

const modules = [
  {
    title: "Clients",
    description: "Manage profiles, care history, and current roster health.",
    href: "/dashboard/clients",
    icon: Users,
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  },
  {
    title: "Appointments",
    description: "Schedule visits and keep the care calendar coordinated.",
    href: "/dashboard/appointments",
    icon: CalendarHeart,
    tone: "border-sky-200 bg-sky-50/70 text-sky-800",
  },
  {
    title: "Reminders",
    description: "Queue and process email reminders for upcoming visits.",
    href: "/dashboard/reminders",
    icon: BellRing,
    tone: "border-cyan-200 bg-cyan-50/70 text-cyan-800",
  },
  {
    title: "Notes",
    description: "Capture session notes and keep documentation complete.",
    href: "/dashboard/notes",
    icon: ClipboardList,
    tone: "border-teal-200 bg-teal-50/70 text-teal-800",
  },
  {
    title: "Treatment Plans",
    description: "Track goals, interventions, and live clinical progress.",
    href: "/dashboard/treatment-plans",
    icon: HeartPulse,
    tone: "border-rose-200 bg-rose-50/70 text-rose-800",
  },
  {
    title: "Billing",
    description: "Review invoices, balances, and incoming payments.",
    href: "/dashboard/billing",
    icon: ReceiptText,
    tone: "border-amber-200 bg-amber-50/70 text-amber-800",
  },
  {
    title: "Messages",
    description: "Record protected therapist-client communication threads.",
    href: "/dashboard/messages",
    icon: MessageSquareHeart,
    tone: "border-teal-200 bg-teal-50/70 text-teal-800",
  },
  {
    title: "Time Tracking",
    description: "Track session-linked work and billable clinical time.",
    href: "/dashboard/time-tracking",
    icon: TimerReset,
    tone: "border-amber-200 bg-amber-50/70 text-amber-800",
  },
  {
    title: "Staff",
    description: "Manage practice roles, access, and roster membership.",
    href: "/dashboard/staff",
    icon: UserCog,
    tone: "border-teal-200 bg-teal-50/70 text-teal-800",
  },
  {
    title: "Intake Forms",
    description: "Prepare digital intake packets and review submissions.",
    href: "/dashboard/intake-forms",
    icon: FileHeart,
    tone: "border-violet-200 bg-violet-50/70 text-violet-800",
  },
  {
    title: "Documents",
    description: "Store reports, forms, and protected clinical files.",
    href: "/dashboard/documents",
    icon: FolderHeart,
    tone: "border-slate-200 bg-slate-50/70 text-slate-800",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);
  const counts = practice ? await getDashboardCounts(practice.id) : null;
  const fullName = user.user_metadata.full_name?.toString().trim() || "My Practice";
  const suggestedSlug =
    fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "my-practice";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.4rem] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,rgba(209,250,229,0.95),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.99),rgba(236,253,250,0.96))] p-8 shadow-[0_40px_100px_rgba(14,116,144,0.12)]">
        <div className="absolute -right-10 top-0 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-800/70">
              Care operations dashboard
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {practice ? practice.name : "Build your therapy workspace"}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              A clinical operations hub designed around appointments, communication,
              intake, and the flow of ongoing care instead of generic admin panels.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-emerald-200 bg-white/80 px-4 py-2">
                Signed in as {user.email ?? "unknown user"}
              </span>
              {practice ? (
                <span className="rounded-full border border-sky-200 bg-white/80 px-4 py-2">
                  Role: {practice.role}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/reminders"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Open reminder center
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {practice ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-[1.8rem] border border-emerald-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(10,91,72,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Active clients</p>
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.clientCount ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Current care roster inside the workspace
              </p>
            </article>
            <article className="rounded-[1.8rem] border border-sky-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Upcoming visits</p>
                <CalendarHeart className="h-5 w-5 text-sky-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.upcomingAppointments ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Scheduled or confirmed appointments ahead
              </p>
            </article>
            <article className="rounded-[1.8rem] border border-cyan-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(8,145,178,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Pending emails</p>
                <BellRing className="h-5 w-5 text-cyan-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.pendingReminders ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Due reminder messages awaiting delivery
              </p>
            </article>
            <article className="rounded-[1.8rem] border border-rose-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(225,29,72,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Active plans</p>
                <HeartPulse className="h-5 w-5 text-rose-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.activePlans ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Live treatment plans needing ongoing review
              </p>
            </article>
            <article className="rounded-[1.8rem] border border-violet-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(124,58,237,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Draft intake forms</p>
                <FileHeart className="h-5 w-5 text-violet-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.draftIntakeForms ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Intake packets awaiting publication
              </p>
            </article>
            <article className="rounded-[1.8rem] border border-amber-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(217,119,6,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Outstanding invoices</p>
                <ReceiptText className="h-5 w-5 text-amber-700" />
              </div>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">
                {counts?.outstandingInvoices ?? 0}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Billing records needing collection follow-up
              </p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_26px_80px_rgba(15,23,42,0.06)]">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Workspace modules
                </p>
                <h2 className="text-3xl font-semibold text-slate-950">
                  Move through the care cycle
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  Each module is tuned for a real healthcare workflow: intake, scheduling,
                  communication, documentation, follow-up, and payment.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className="group rounded-[1.6rem] border border-slate-200/80 bg-slate-50/70 p-5 transition hover:-translate-y-1 hover:border-sky-300 hover:bg-white hover:shadow-[0_24px_50px_rgba(14,116,144,0.12)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className={`rounded-2xl border px-3 py-3 ${module.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400 transition group-hover:text-sky-700">
                          Open
                        </span>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-slate-950">
                        {module.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {module.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[2rem] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,253,250,0.96))] p-8 shadow-[0_26px_80px_rgba(10,91,72,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800/70">
                  Clinical pulse
                </p>
                <Activity className="h-5 w-5 text-emerald-700" />
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                Today&apos;s care priorities
              </h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-emerald-200 bg-white/90 p-4">
                  <p className="text-sm font-medium text-slate-900">Communication</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {counts?.pendingReminders ?? 0} reminder emails are currently queued for delivery.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-4">
                  <p className="text-sm font-medium text-slate-900">Coordination</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {counts?.upcomingAppointments ?? 0} upcoming appointments are active on the calendar.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white/90 p-4">
                  <p className="text-sm font-medium text-slate-900">Clinical review</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {counts?.activePlans ?? 0} treatment plans are live and need ongoing progress tracking.
                  </p>
                </div>
              </div>
              <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white/90 p-5">
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-slate-700" />
                  <p className="text-sm font-medium text-slate-900">Practice profile</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use this workspace as the operating layer for intake, scheduling,
                  communication, documentation, and payment tracking.
                </p>
              </div>
            </article>
          </section>
        </>
      ) : (
        <WorkspaceSetupForm
          suggestedName={fullName}
          suggestedSlug={suggestedSlug}
        />
      )}
    </main>
  );
}
