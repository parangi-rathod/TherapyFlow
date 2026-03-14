import Link from "next/link";
import { redirect } from "next/navigation";

import { ClientDeleteButton } from "@/components/clients/client-delete-button";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/clients/client-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Clients | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  therapy_history: string | null;
  status: "lead" | "active" | "inactive" | "discharged";
  created_at: string;
};

function mapClientToFormValues(client: ClientRow): ClientFormValues {
  return {
    id: client.id,
    firstName: client.first_name,
    lastName: client.last_name,
    dateOfBirth: client.date_of_birth ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    emergencyContactName: client.emergency_contact_name ?? "",
    emergencyContactPhone: client.emergency_contact_phone ?? "",
    emergencyContactRelationship: client.emergency_contact_relationship ?? "",
    therapyHistory: client.therapy_history ?? "",
    status: client.status,
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
    return { practice: null, clients: [] as ClientRow[] };
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, date_of_birth, email, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, therapy_history, status, created_at",
    )
    .eq("practice_id", practice.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
  };
}

function SummaryCards({
  practice,
  clients,
}: {
  practice: PracticeContext;
  clients: ClientRow[];
}) {
  const activeClients = clients.filter((client) => client.status === "active");
  const leads = clients.filter((client) => client.status === "lead");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Total clients</p>
        <h2 className="mt-3 text-3xl font-semibold">{clients.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Active clients: {activeClients.length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Pipeline</p>
        <h2 className="mt-3 text-3xl font-semibold">{leads.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Open leads in intake</p>
      </article>
    </section>
  );
}

export default async function ClientsPage() {
  const { practice, clients } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your first practice before adding clients
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Client records are scoped to a practice. Start by setting up the
            workspace on the dashboard, then come back here.
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Client management
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Clients
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Add new clients, maintain intake details, and keep contact and
            therapy context current inside {practice.name}.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          Back to dashboard
        </Link>
      </header>

      <SummaryCards practice={practice} clients={clients} />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New client
          </p>
          <h2 className="text-2xl font-semibold">Create a client profile</h2>
        </div>
        <div className="mt-6">
          <ClientForm
            mode="create"
            initialValues={{
              firstName: "",
              lastName: "",
              dateOfBirth: "",
              email: "",
              phone: "",
              emergencyContactName: "",
              emergencyContactPhone: "",
              emergencyContactRelationship: "",
              therapyHistory: "",
              status: "active",
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Existing records
          </p>
          <h2 className="text-2xl font-semibold">Manage current clients</h2>
        </div>

        {clients.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No clients yet. Create the first client profile above.
          </article>
        ) : (
          clients.map((client) => (
            <article
              key={client.id}
              className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {client.first_name} {client.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {client.status}
                  </p>
                </div>
                <ClientDeleteButton
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                />
              </div>
              <div className="mt-6">
                <ClientForm
                  mode="edit"
                  initialValues={mapClientToFormValues(client)}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
