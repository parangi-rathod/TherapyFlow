import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CalendarHeart,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MapPin,
  NotebookPen,
  Stethoscope,
  Video,
} from "lucide-react";

import { AppointmentDeleteButton } from "@/components/appointments/appointment-delete-button";
import {
  AppointmentForm,
  type AppointmentFormValues,
} from "@/components/appointments/appointment-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Appointments | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  location_type: "in_person" | "virtual" | "phone";
  location_details: string | null;
  meeting_url: string | null;
  created_at: string;
};

type ReminderRow = {
  id: string;
  appointment_id: string;
  status: "pending" | "sent" | "failed" | "cancelled";
};

function toDatetimeLocal(value: string) {
  return value.slice(0, 16);
}

function formatFriendly(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

function getStatusTone(
  status: AppointmentRow["status"] | ReminderRow["status"],
) {
  switch (status) {
    case "confirmed":
    case "sent":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "scheduled":
    case "pending":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "no_show":
    case "failed":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getLocationLabel(appointment: AppointmentRow) {
  if (appointment.location_type === "virtual") {
    return appointment.meeting_url?.trim()
      ? "Virtual visit link attached"
      : "Virtual visit";
  }

  if (appointment.location_type === "phone") {
    return "Phone session";
  }

  return appointment.location_details?.trim() || "In-person visit";
}

function mapAppointmentToFormValues(
  appointment: AppointmentRow,
): AppointmentFormValues {
  return {
    id: appointment.id,
    clientId: appointment.client_id,
    startsAt: toDatetimeLocal(appointment.starts_at),
    endsAt: toDatetimeLocal(appointment.ends_at),
    timezone: appointment.timezone,
    status: appointment.status,
    locationType: appointment.location_type,
    locationDetails: appointment.location_details ?? "",
    meetingUrl: appointment.meeting_url ?? "",
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
      appointments: [] as AppointmentRow[],
      reminders: [] as ReminderRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: appointments, error: appointmentsError },
    { data: reminders, error: remindersError },
  ] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("practice_id", practice.id)
        .order("first_name", { ascending: true }),
      supabase
        .from("appointments")
        .select(
          "id, client_id, starts_at, ends_at, timezone, status, location_type, location_details, meeting_url, created_at",
        )
        .eq("practice_id", practice.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("reminders")
        .select("id, appointment_id, status")
        .eq("practice_id", practice.id),
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
  appointments,
  reminders,
}: {
  practice: PracticeContext;
  appointments: AppointmentRow[];
  reminders: ReminderRow[];
}) {
  const upcoming = appointments.filter(
    (appointment) =>
      new Date(appointment.starts_at) >= new Date() &&
      (appointment.status === "scheduled" || appointment.status === "confirmed"),
  );
  const completed = appointments.filter(
    (appointment) => appointment.status === "completed",
  );
  const noShows = appointments.filter(
    (appointment) => appointment.status === "no_show",
  );
  const pendingReminders = reminders.filter(
    (reminder) => reminder.status === "pending",
  );

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.85rem] border border-emerald-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(10,91,72,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Practice pulse</p>
          <Stethoscope className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">
          {practice.name}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-[1.85rem] border border-sky-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(14,116,144,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Upcoming visits</p>
          <CalendarHeart className="h-5 w-5 text-sky-700" />
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
          {upcoming.length}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scheduled or confirmed sessions ahead
        </p>
      </article>
      <article className="rounded-[1.85rem] border border-cyan-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(8,145,178,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Schedule signals</p>
          <BellRing className="h-5 w-5 text-cyan-700" />
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
          {pendingReminders.length}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pending reminders: {pendingReminders.length} | No-show: {noShows.length} | Completed: {completed.length}
        </p>
      </article>
    </section>
  );
}

export default async function AppointmentsPage() {
  const { practice, clients, appointments, reminders } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before booking appointments
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Appointment records are practice-scoped and protected by RLS. Start
            by setting up the workspace on the dashboard.
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
            Add a client before scheduling appointments
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Appointments attach directly to client records. Create at least one
            client first, then come back to schedule sessions.
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
    clients.map((client) => [client.id, `${client.first_name} ${client.last_name}`]),
  );
  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-sky-200/70 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.9),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,250,0.95))] p-8 shadow-[0_30px_80px_rgba(12,74,110,0.12)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-800/70">
              Clinical scheduling desk
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Appointments
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Manage the live care calendar for {practice.name}, keep each visit
              clinically organized, and coordinate reminder timing directly from
              the same schedule.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-sky-200 bg-white/85 px-4 py-2">
                Timezone-aware booking
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/85 px-4 py-2">
                Care-ready reminders
              </span>
              <span className="rounded-full border border-cyan-200 bg-white/85 px-4 py-2">
                Practice-scoped records
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              Back to dashboard
            </Link>
            <Link
              href="/dashboard/reminders"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              Open reminder center
            </Link>
          </div>
        </div>
      </header>

      <SummaryCards
        practice={practice}
        appointments={appointments}
        reminders={reminders}
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.8fr]">
        <article className="rounded-[2rem] border border-sky-200/70 bg-white/92 p-8 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
              New appointment
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              Book a session
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Enter the real appointment start and end time, confirm the visit
              timezone, and the reminder system will calculate any queued email
              timing from that schedule.
            </p>
          </div>
          <div className="mt-6">
            <AppointmentForm
              mode="create"
              clientOptions={clientOptions}
              initialValues={{
                clientId: clientOptions[0]?.id ?? "",
                startsAt: "",
                endsAt: "",
                timezone: "UTC",
                status: "scheduled",
                locationType: "in_person",
                locationDetails: "",
                meetingUrl: "",
              }}
            />
          </div>
        </article>

        <article className="rounded-[2rem] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,253,250,0.96))] p-8 shadow-[0_24px_70px_rgba(10,91,72,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800/70">
              Careboard
            </p>
            <NotebookPen className="h-5 w-5 text-emerald-700" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            Schedule quality checks
          </h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium text-slate-900">Visit timing</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Use the actual visit time in the appointment form. Reminder lead
                time is always calculated from that start time.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <p className="text-sm font-medium text-slate-900">Client readiness</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Appointment updates can trigger confirmation email delivery when
                the client record includes an email address.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <CircleAlert className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-medium text-slate-900">Reminder sync</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Moving or cancelling an appointment automatically resyncs pending
                reminders so outdated timings do not stay queued.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Current schedule
          </p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Manage booked appointments
          </h2>
        </div>

        {appointments.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-white/70 p-8 text-sm text-slate-600">
            No appointments yet. Use the form above to schedule the first session.
          </article>
        ) : (
          appointments.map((appointment) => {
            const appointmentReminders = reminders.filter(
              (reminder) => reminder.appointment_id === appointment.id,
            );
            const reminderStatus =
              appointmentReminders.find((reminder) => reminder.status === "pending")
                ?.status ||
              appointmentReminders.find((reminder) => reminder.status === "failed")
                ?.status ||
              appointmentReminders.find((reminder) => reminder.status === "sent")
                ?.status ||
              appointmentReminders[0]?.status;

            return (
              <article
                key={appointment.id}
                className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-950">
                        {clientMap.get(appointment.client_id) ?? "Unknown client"}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getStatusTone(
                          appointment.status,
                        )}`}
                      >
                        {titleCase(appointment.status)}
                      </span>
                      {reminderStatus ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getStatusTone(
                            reminderStatus,
                          )}`}
                        >
                          Reminder {titleCase(reminderStatus)}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          <Clock3 className="h-4 w-4 text-sky-700" />
                          <span className="font-medium">Visit window</span>
                        </div>
                        <p className="mt-2 leading-7">
                          {formatFriendly(appointment.starts_at, appointment.timezone)} to{" "}
                          {formatFriendly(appointment.ends_at, appointment.timezone)}
                        </p>
                      </div>
                      <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          {appointment.location_type === "virtual" ? (
                            <Video className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <MapPin className="h-4 w-4 text-emerald-700" />
                          )}
                          <span className="font-medium">Location</span>
                        </div>
                        <p className="mt-2 leading-7">{getLocationLabel(appointment)}</p>
                      </div>
                      <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          <BellRing className="h-4 w-4 text-cyan-700" />
                          <span className="font-medium">Reminder coverage</span>
                        </div>
                        <p className="mt-2 leading-7">
                          {appointmentReminders.length > 0
                            ? `${appointmentReminders.length} reminder record(s) linked`
                            : "No reminder linked yet"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <AppointmentDeleteButton
                    appointmentId={appointment.id}
                    appointmentLabel={formatFriendly(
                      appointment.starts_at,
                      appointment.timezone,
                    )}
                  />
                </div>

                <div className="mt-6">
                  <AppointmentForm
                    mode="edit"
                    clientOptions={clientOptions}
                    initialValues={mapAppointmentToFormValues(appointment)}
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
