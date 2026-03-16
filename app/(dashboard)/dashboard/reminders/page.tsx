import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CircleAlert, HeartPulse, MailCheck } from "lucide-react";

import { ReminderCancelButton } from "@/components/reminders/reminder-cancel-button";
import { ProcessEmailRemindersButton } from "@/components/reminders/process-email-reminders-button";
import {
  ReminderForm,
  type ReminderAppointmentOption,
  type ReminderFormValues,
} from "@/components/reminders/reminder-form";
import {
  buildReminderMessage,
  formatReminderOffset,
  parseReminderPayload,
} from "@/lib/reminders/schedule";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reminders | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  starts_at: string;
  timezone: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type ReminderRow = {
  id: string;
  appointment_id: string;
  channel: "email" | "sms" | "in_app";
  scheduled_for: string;
  sent_at: string | null;
  status: "pending" | "sent" | "failed" | "cancelled";
  payload: unknown;
  created_at: string;
};

function formatFriendly(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatChannel(value: ReminderRow["channel"]) {
  return value === "sms" ? "SMS" : value === "email" ? "Email" : "In-app";
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
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
      appointments: [] as AppointmentRow[],
      reminders: [] as ReminderRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: appointments, error: appointmentsError },
    { data: reminders, error: remindersError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, client_id, starts_at, timezone, status")
      .eq("practice_id", practice.id)
      .order("starts_at", { ascending: true }),
    supabase
      .from("reminders")
      .select("id, appointment_id, channel, scheduled_for, sent_at, status, payload, created_at")
      .eq("practice_id", practice.id)
      .in("channel", ["email", "sms"])
      .order("scheduled_for", { ascending: true }),
  ]);

  if (clientsError) {
    throw clientsError;
  }

  if (appointmentsError) {
    throw appointmentsError;
  }

  if (remindersError) {
    throw remindersError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    appointments: (appointments ?? []) as AppointmentRow[],
    reminders: (reminders ?? []) as ReminderRow[],
  };
}

function SummaryCards({
  practice,
  reminders,
}: {
  practice: PracticeContext;
  reminders: ReminderRow[];
}) {
  const pending = reminders.filter((reminder) => reminder.status === "pending");
  const sent = reminders.filter((reminder) => reminder.status === "sent");
  const failed = reminders.filter((reminder) => reminder.status === "failed");
  const email = reminders.filter((reminder) => reminder.channel === "email");
  const sms = reminders.filter((reminder) => reminder.channel === "sms");

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <article className="rounded-[1.75rem] border border-emerald-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(10,91,72,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Practice</p>
          <HeartPulse className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-[1.75rem] border border-sky-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(11,94,163,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pending emails</p>
          <BellRing className="h-5 w-5 text-sky-700" />
        </div>
        <h2 className="mt-3 text-3xl font-semibold">{pending.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Queued before care sessions</p>
      </article>
      <article className="rounded-[1.75rem] border border-teal-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(13,148,136,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Delivered</p>
          <MailCheck className="h-5 w-5 text-teal-700" />
        </div>
        <h2 className="mt-3 text-3xl font-semibold">{sent.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Email plans: {email.length} | SMS plans: {sms.length}
        </p>
      </article>
      <article className="rounded-[1.75rem] border border-amber-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(180,83,9,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Needs attention</p>
          <CircleAlert className="h-5 w-5 text-amber-700" />
        </div>
        <h2 className="mt-3 text-3xl font-semibold">{failed.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Failed deliveries needing follow-up</p>
      </article>
    </section>
  );
}

function mapReminderToFormValues(reminder: ReminderRow): ReminderFormValues {
  const payload = parseReminderPayload(reminder.payload);

  return {
    id: reminder.id,
    appointmentId: reminder.appointment_id,
    channel: reminder.channel === "sms" ? "sms" : "email",
    offsetMinutes: payload.offsetMinutes ?? 1440,
    message: payload.message ?? "",
  };
}

function buildAppointmentOption(input: {
  appointment: AppointmentRow;
  client: ClientRow | undefined;
}): ReminderAppointmentOption {
  const clientName = input.client
    ? `${input.client.first_name} ${input.client.last_name}`
    : "Unknown client";

  return {
    id: input.appointment.id,
    label: `${clientName} • ${formatFriendly(
      input.appointment.starts_at,
      input.appointment.timezone,
    )}`,
    startsAt: input.appointment.starts_at,
    timezone: input.appointment.timezone,
    clientName,
    email: input.client?.email ?? null,
    phone: input.client?.phone ?? null,
  };
}

export default async function RemindersPage() {
  const { practice, clients, appointments, reminders } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before scheduling reminders
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Reminder records are practice-scoped and protected by RLS. Start by
            setting up the workspace on the dashboard.
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

  if (appointments.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Appointments required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Book appointments before queuing reminders
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Reminder timing is calculated from appointment start times. Create
            at least one appointment first, then come back to automate follow-up.
          </p>
          <Link
            href="/dashboard/appointments"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open appointment scheduling
          </Link>
        </section>
      </main>
    );
  }

  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const appointmentMap = new Map(
    appointments.map((appointment) => [appointment.id, appointment]),
  );
  const appointmentOptions: ReminderAppointmentOption[] = appointments
    .filter(
      (appointment) =>
        appointment.status !== "cancelled" &&
        new Date(appointment.starts_at) > new Date(),
    )
    .map((appointment) =>
      buildAppointmentOption({
        appointment,
        client: clientMap.get(appointment.client_id),
      }),
    );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-sky-200/70 bg-[radial-gradient(circle_at_top_left,rgba(190,242,255,0.85),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,250,0.96))] p-8 shadow-[0_30px_80px_rgba(12,74,110,0.12)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-800/70">
              Patient communication hub
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Reminders
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Coordinate appointment reminders with a calmer, care-focused workflow.
              Email reminders can now be processed for live delivery, while the care
              team still keeps full control over timing and message content inside {practice.name}.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-emerald-200 bg-white/80 px-4 py-2">
                Clinical comms
              </span>
              <span className="rounded-full border border-sky-200 bg-white/80 px-4 py-2">
                Time-aware scheduling
              </span>
              <span className="rounded-full border border-teal-200 bg-white/80 px-4 py-2">
                Manual send control
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ProcessEmailRemindersButton />
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              Back to dashboard
            </Link>
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              Open appointments
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.4fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-emerald-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,118,110,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800/70">
            Operational note
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            Email sending is now provider-backed
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, then process due email reminders here or call the secured reminder processing API for automation.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-sky-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(14,116,144,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
            Delivery guidance
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use the appointment start time as the real visit time, then set the reminder offset in minutes before that start. Due email reminders move from `pending` to `sent` or `failed` when processed.
          </p>
        </article>
      </section>

      <SummaryCards practice={practice} reminders={reminders} />

      {appointmentOptions.length > 0 ? (
        <section className="rounded-[2rem] border border-sky-200/70 bg-white/90 p-8 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
              New reminder
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">Queue a reminder</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Configure the exact lead time and wording the client should receive before care.
            </p>
          </div>
          <div className="mt-6">
            <ReminderForm
              mode="create"
              practiceName={practice.name}
              appointmentOptions={appointmentOptions}
              initialValues={{
                appointmentId: appointmentOptions[0]?.id ?? "",
                channel: "email",
                offsetMinutes: 1440,
                message: appointmentOptions[0]
                  ? buildReminderMessage({
                      channel: "email",
                      clientName: appointmentOptions[0].clientName,
                      appointmentLabel: appointmentOptions[0].label,
                      practiceName: practice.name,
                    })
                  : "",
              }}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-sky-200 bg-white/70 p-8 text-sm text-slate-600">
          All upcoming appointments are either in the past or cancelled. Book a
          future appointment to queue reminders.
        </section>
      )}

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reminder queue
          </p>
          <h2 className="text-2xl font-semibold">Monitor delivery timing and outcomes</h2>
        </div>

        {reminders.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-white/70 p-8 text-sm text-slate-600">
            No reminders yet. Use the form above to queue the first delivery.
          </article>
        ) : (
          reminders.map((reminder) => {
            const appointment = appointmentMap.get(reminder.appointment_id);
            const appointmentOption = appointmentOptions.find(
              (option) => option.id === reminder.appointment_id,
            );
            const fallbackAppointmentOption =
              appointment && !appointmentOption
                ? buildAppointmentOption({
                    appointment,
                    client: clientMap.get(appointment.client_id),
                  })
                : null;
            const payload = parseReminderPayload(reminder.payload);
            const offsetMinutes = payload.offsetMinutes ?? 1440;
            const client = appointment ? clientMap.get(appointment.client_id) : null;
            const clientName = client
              ? `${client.first_name} ${client.last_name}`
              : payload.clientName ?? "Unknown client";
            const reminderLabel = appointment
              ? `${clientName} on ${formatFriendly(
                  appointment.starts_at,
                  appointment.timezone,
                )}`
              : clientName;

            return (
              <article
                key={reminder.id}
                className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-950">{clientName}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
                        {formatChannel(reminder.channel)}
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700">
                        {titleCase(reminder.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatReminderOffset(offsetMinutes)} • Scheduled for{" "}
                      {appointment
                        ? formatFriendly(
                            reminder.scheduled_for,
                            appointment.timezone,
                          )
                        : formatFriendly(reminder.scheduled_for, "UTC")}
                    </p>
                    <p className="text-sm text-slate-600">
                      Target: {payload.deliveryTarget ?? "Missing delivery target"}
                    </p>
                    {payload.error ? (
                      <p className="text-sm text-amber-700">Failure: {payload.error}</p>
                    ) : null}
                  </div>
                  <ReminderCancelButton
                    reminderId={reminder.id}
                    reminderLabel={reminderLabel}
                  />
                </div>
                <div className="mt-6">
                  <ReminderForm
                    mode="edit"
                    practiceName={practice.name}
                    appointmentOptions={
                      appointmentOption
                        ? [
                            appointmentOption,
                            ...appointmentOptions.filter(
                              (option) => option.id !== appointmentOption.id,
                            ),
                          ]
                        : fallbackAppointmentOption
                          ? [fallbackAppointmentOption, ...appointmentOptions]
                        : appointmentOptions
                    }
                    initialValues={mapReminderToFormValues(reminder)}
                  />
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
