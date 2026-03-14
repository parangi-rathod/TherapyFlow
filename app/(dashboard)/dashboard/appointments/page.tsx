import Link from "next/link";
import { redirect } from "next/navigation";

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
    };
  }

  const [{ data: clients, error: clientsError }, { data: appointments, error: appointmentsError }] =
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
    ]);

  if (clientsError) {
    throw clientsError;
  }

  if (appointmentsError) {
    throw appointmentsError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    appointments: (appointments ?? []) as AppointmentRow[],
  };
}

function SummaryCards({
  practice,
  appointments,
}: {
  practice: PracticeContext;
  appointments: AppointmentRow[];
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

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Upcoming</p>
        <h2 className="mt-3 text-3xl font-semibold">{upcoming.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scheduled or confirmed sessions ahead
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Outcome signals</p>
        <h2 className="mt-3 text-3xl font-semibold">{completed.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Completed: {completed.length} | No-show: {noShows.length}
        </p>
      </article>
    </section>
  );
}

export default async function AppointmentsPage() {
  const { practice, clients, appointments } = await getPageData();

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
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Appointment scheduling
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Appointments
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Schedule sessions, update appointment status, and keep the current
            practice calendar organized inside {practice.name}.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          Back to dashboard
        </Link>
      </header>

      <SummaryCards practice={practice} appointments={appointments} />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New appointment
          </p>
          <h2 className="text-2xl font-semibold">Book a session</h2>
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
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Current schedule
          </p>
          <h2 className="text-2xl font-semibold">Manage booked appointments</h2>
        </div>

        {appointments.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No appointments yet. Use the form above to schedule the first session.
          </article>
        ) : (
          appointments.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {clientMap.get(appointment.client_id) ?? "Unknown client"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFriendly(appointment.starts_at, appointment.timezone)} to{" "}
                    {formatFriendly(appointment.ends_at, appointment.timezone)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {appointment.status} | Location: {appointment.location_type}
                  </p>
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
          ))
        )}
      </section>
    </main>
  );
}
