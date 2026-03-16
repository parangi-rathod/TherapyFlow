import Link from "next/link";
import { redirect } from "next/navigation";

import {
  NoteForm,
  type NoteFormValues,
} from "@/components/notes/note-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Session Notes | TherapyFlow",
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
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type SessionRow = {
  id: string;
  appointment_id: string | null;
  client_id: string;
  started_at: string;
  ended_at: string | null;
  status: "draft" | "completed" | "cancelled";
  created_at: string;
};

type NoteRow = {
  id: string;
  session_id: string;
  title: string | null;
  plain_text: string | null;
  tags: string[] | null;
  ai_summary: string | null;
  status: "draft" | "final";
  finalized_at: string | null;
  created_at: string;
};

function toDatetimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function formatFriendly(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapNoteToFormValues(
  note: NoteRow,
  session: SessionRow,
): NoteFormValues {
  return {
    id: note.id,
    sessionId: session.id,
    appointmentId: session.appointment_id ?? "",
    startsAt: toDatetimeLocal(session.started_at),
    endsAt: toDatetimeLocal(session.ended_at ?? session.started_at),
    sessionStatus: session.status,
    title: note.title ?? "",
    plainText: note.plain_text ?? "",
    tags: note.tags?.join(", ") ?? "",
    aiSummary: note.ai_summary ?? "",
    noteStatus: note.status,
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
      sessions: [] as SessionRow[],
      notes: [] as NoteRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: appointments, error: appointmentsError },
    { data: sessions, error: sessionsError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, client_id, starts_at, ends_at, status")
      .eq("practice_id", practice.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, appointment_id, client_id, started_at, ended_at, status, created_at")
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("id, session_id, title, plain_text, tags, ai_summary, status, finalized_at, created_at")
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
  ]);

  if (clientsError) throw clientsError;
  if (appointmentsError) throw appointmentsError;
  if (sessionsError) throw sessionsError;
  if (notesError) throw notesError;

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    appointments: (appointments ?? []) as AppointmentRow[],
    sessions: (sessions ?? []) as SessionRow[],
    notes: (notes ?? []) as NoteRow[],
  };
}

function SummaryCards({
  practice,
  notes,
}: {
  practice: PracticeContext;
  notes: NoteRow[];
}) {
  const finalNotes = notes.filter((note) => note.status === "final");
  const draftNotes = notes.filter((note) => note.status === "draft");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Total notes</p>
        <h2 className="mt-3 text-3xl font-semibold">{notes.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Finalized notes: {finalNotes.length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Drafts</p>
        <h2 className="mt-3 text-3xl font-semibold">{draftNotes.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Notes still pending review
        </p>
      </article>
    </section>
  );
}

export default async function NotesPage() {
  const { practice, clients, appointments, sessions, notes } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before writing session notes
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Session records and notes are practice-scoped. Start by setting up
            the workspace on the dashboard.
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
            Appointment history required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Schedule an appointment before writing session notes
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            The first notes workflow is appointment-linked so sessions and notes
            stay consistent with the existing calendar.
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

  const clientMap = new Map(
    clients.map((client) => [client.id, `${client.first_name} ${client.last_name}`]),
  );
  const appointmentMap = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const appointmentOptions = appointments.map((appointment) => ({
    id: appointment.id,
    label: `${clientMap.get(appointment.client_id) ?? "Unknown client"} • ${formatFriendly(
      appointment.starts_at,
    )}`,
  }));

  const validNotes = notes.filter((note) => {
    const session = sessionMap.get(note.session_id);
    return session && session.appointment_id;
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Session documentation
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Session notes
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create structured session notes, review existing documentation, and
            keep clinical records organized for {practice.name}.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          Back to dashboard
        </Link>
      </header>

      <SummaryCards practice={practice} notes={validNotes} />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New note
          </p>
          <h2 className="text-2xl font-semibold">Document a session</h2>
        </div>
        <div className="mt-6">
          <NoteForm
            mode="create"
            appointmentOptions={appointmentOptions}
            initialValues={{
              appointmentId: appointmentOptions[0]?.id ?? "",
              startsAt: "",
              endsAt: "",
              sessionStatus: "completed",
              title: "",
              plainText: "",
              tags: "",
              aiSummary: "",
              noteStatus: "draft",
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Existing notes
          </p>
          <h2 className="text-2xl font-semibold">Review and update records</h2>
        </div>

        {validNotes.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No session notes yet. Use the form above to document the first session.
          </article>
        ) : (
          validNotes.map((note) => {
            const session = sessionMap.get(note.session_id);

            if (!session || !session.appointment_id) {
              return null;
            }

            const appointment = appointmentMap.get(session.appointment_id);
            const clientName = clientMap.get(session.client_id) ?? "Unknown client";

            return (
              <article
                key={note.id}
                className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {note.title ?? "Untitled note"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {clientName}
                    {appointment ? ` • ${formatFriendly(appointment.starts_at)}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Note status: {note.status} | Session status: {session.status}
                  </p>
                  {note.tags && note.tags.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tags: {note.tags.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="mt-6">
                  <NoteForm
                    mode="edit"
                    appointmentOptions={appointmentOptions}
                    initialValues={mapNoteToFormValues(note, session)}
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
