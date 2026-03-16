import Link from "next/link";
import { redirect } from "next/navigation";

import { InvoiceDeleteButton } from "@/components/billing/invoice-delete-button";
import {
  InvoiceForm,
  type InvoiceFormValues,
} from "@/components/billing/invoice-form";
import { PaymentDeleteButton } from "@/components/billing/payment-delete-button";
import { PaymentForm } from "@/components/billing/payment-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Billing | TherapyFlow",
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
  timezone: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type InvoiceRow = {
  id: string;
  client_id: string;
  appointment_id: string | null;
  invoice_number: string;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: "draft" | "sent" | "partial" | "paid" | "void";
  issued_at: string | null;
  due_at: string | null;
  notes: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  payment_method: "cash" | "card" | "ach" | "manual" | "other";
  external_reference: string | null;
  paid_at: string;
  created_at: string;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
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

function formatAppointmentLabel(appointment: AppointmentRow, clientName: string) {
  return `${clientName} • ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appointment.timezone,
  }).format(new Date(appointment.starts_at))}`;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function mapInvoiceToFormValues(invoice: InvoiceRow): InvoiceFormValues {
  return {
    id: invoice.id,
    clientId: invoice.client_id,
    appointmentId: invoice.appointment_id ?? "",
    invoiceNumber: invoice.invoice_number,
    currency: invoice.currency,
    subtotalCents: invoice.subtotal_cents,
    taxCents: invoice.tax_cents,
    status: invoice.status,
    issuedAt: toDateInput(invoice.issued_at),
    dueAt: toDateInput(invoice.due_at),
    notes: invoice.notes ?? "",
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
      invoices: [] as InvoiceRow[],
      payments: [] as PaymentRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: appointments, error: appointmentsError },
    { data: invoices, error: invoicesError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, client_id, starts_at, timezone, status")
      .eq("practice_id", practice.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("invoices")
      .select(
        "id, client_id, appointment_id, invoice_number, currency, subtotal_cents, tax_cents, total_cents, status, issued_at, due_at, notes, created_at",
      )
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select(
        "id, invoice_id, amount_cents, currency, payment_method, external_reference, paid_at, created_at",
      )
      .eq("practice_id", practice.id)
      .order("paid_at", { ascending: false }),
  ]);

  if (clientsError) {
    throw clientsError;
  }

  if (appointmentsError) {
    throw appointmentsError;
  }

  if (invoicesError) {
    throw invoicesError;
  }

  if (paymentsError) {
    throw paymentsError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    appointments: (appointments ?? []) as AppointmentRow[],
    invoices: (invoices ?? []) as InvoiceRow[],
    payments: (payments ?? []) as PaymentRow[],
  };
}

function SummaryCards({
  practice,
  invoices,
  payments,
}: {
  practice: PracticeContext;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
}) {
  const totalBilled = invoices
    .filter((invoice) => invoice.status !== "void")
    .reduce((total, invoice) => total + invoice.total_cents, 0);
  const totalCollected = payments.reduce(
    (total, payment) => total + payment.amount_cents,
    0,
  );
  const outstanding = Math.max(0, totalBilled - totalCollected);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Total billed</p>
        <h2 className="mt-3 text-3xl font-semibold">
          {formatCurrency(totalBilled, "USD")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Active invoices: {invoices.filter((invoice) => invoice.status !== "void").length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Outstanding balance</p>
        <h2 className="mt-3 text-3xl font-semibold">
          {formatCurrency(outstanding, "USD")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Collected: {formatCurrency(totalCollected, "USD")}
        </p>
      </article>
    </section>
  );
}

export default async function BillingPage() {
  const { practice, clients, appointments, invoices, payments } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before tracking billing
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Billing data is practice-scoped and protected by role-aware access
            rules. Start by setting up the workspace on the dashboard.
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
            Add a client before creating invoices
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Every invoice belongs to a client record. Create at least one client
            first, then return here to start tracking balances and payments.
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
  const appointmentOptions = appointments.map((appointment) => ({
    id: appointment.id,
    label: formatAppointmentLabel(
      appointment,
      clientNameById.get(appointment.client_id) ?? "Unknown client",
    ),
  }));
  const paymentsByInvoiceId = new Map<string, PaymentRow[]>();

  for (const payment of payments) {
    const invoicePayments = paymentsByInvoiceId.get(payment.invoice_id) ?? [];
    invoicePayments.push(payment);
    paymentsByInvoiceId.set(payment.invoice_id, invoicePayments);
  }

  const nextInvoiceNumber = `INV-${String(invoices.length + 1).padStart(4, "0")}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Billing and payments
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Billing
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create invoices, monitor outstanding balances, and record incoming
            payments for {practice.name}.
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
            href="/dashboard/appointments"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Open appointments
          </Link>
        </div>
      </header>

      <SummaryCards practice={practice} invoices={invoices} payments={payments} />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New invoice
          </p>
          <h2 className="text-2xl font-semibold">Create an invoice</h2>
        </div>
        <div className="mt-6">
          <InvoiceForm
            mode="create"
            clientOptions={clientOptions}
            appointmentOptions={appointmentOptions}
            initialValues={{
              clientId: clientOptions[0]?.id ?? "",
              appointmentId: "",
              invoiceNumber: nextInvoiceNumber,
              currency: "USD",
              subtotalCents: 0,
              taxCents: 0,
              status: "draft",
              issuedAt: "",
              dueAt: "",
              notes: "",
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Existing invoices
          </p>
          <h2 className="text-2xl font-semibold">Track balances and payments</h2>
        </div>

        {invoices.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No invoices yet. Create the first billing record above.
          </article>
        ) : (
          invoices.map((invoice) => {
            const invoicePayments = paymentsByInvoiceId.get(invoice.id) ?? [];
            const paidAmount = invoicePayments.reduce(
              (total, payment) => total + payment.amount_cents,
              0,
            );
            const outstanding = Math.max(0, invoice.total_cents - paidAmount);

            return (
              <article
                key={invoice.id}
                className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{invoice.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {clientNameById.get(invoice.client_id) ?? "Unknown client"} •{" "}
                      {titleCase(invoice.status)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total {formatCurrency(invoice.total_cents, invoice.currency)} •
                      Outstanding {formatCurrency(outstanding, invoice.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Issued {formatDate(invoice.issued_at)} • Due {formatDate(invoice.due_at)}
                    </p>
                  </div>
                  <InvoiceDeleteButton
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.invoice_number}
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatCurrency(invoice.subtotal_cents, invoice.currency)}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Tax</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatCurrency(invoice.tax_cents, invoice.currency)}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatCurrency(paidAmount, invoice.currency)}
                    </p>
                  </article>
                </div>

                {invoice.notes ? (
                  <div className="mt-6 rounded-2xl border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
                    {invoice.notes}
                  </div>
                ) : null}

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Payments
                    </p>
                    <h4 className="text-xl font-semibold">Record and manage payments</h4>
                  </div>

                  <div className="mt-5">
                    {invoice.status === "void" ? (
                      <p className="text-sm text-muted-foreground">
                        Void invoices cannot receive new payments.
                      </p>
                    ) : outstanding === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        This invoice is fully paid.
                      </p>
                    ) : (
                      <PaymentForm
                        invoiceId={invoice.id}
                        currency={invoice.currency}
                        suggestedAmountCents={outstanding}
                      />
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    {invoicePayments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No payments recorded yet.
                      </p>
                    ) : (
                      invoicePayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 md:flex-row md:items-start md:justify-between"
                        >
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">
                              {formatCurrency(payment.amount_cents, payment.currency)} •{" "}
                              {titleCase(payment.payment_method)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Paid {formatDateTime(payment.paid_at)}
                            </p>
                            {payment.external_reference ? (
                              <p className="text-sm text-muted-foreground">
                                Reference: {payment.external_reference}
                              </p>
                            ) : null}
                          </div>
                          <PaymentDeleteButton
                            paymentId={payment.id}
                            paymentLabel={formatCurrency(
                              payment.amount_cents,
                              payment.currency,
                            )}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Invoice details
                    </p>
                    <h4 className="text-xl font-semibold">Edit billing record</h4>
                  </div>
                  <div className="mt-5">
                    <InvoiceForm
                      mode="edit"
                      clientOptions={clientOptions}
                      appointmentOptions={appointmentOptions}
                      initialValues={mapInvoiceToFormValues(invoice)}
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
