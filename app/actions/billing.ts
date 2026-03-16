"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  InvoiceSchema,
  PaymentSchema,
  UpdateInvoiceSchema,
  type InvoiceSchemaInput,
  type PaymentSchemaInput,
  type UpdateInvoiceSchemaInput,
} from "@/lib/validations/billing";

type ActionResult = {
  success: boolean;
  error?: string;
};

type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "void";

type InvoiceRow = {
  id: string;
  client_id: string;
  appointment_id: string | null;
  currency: string;
  total_cents: number;
  status: InvoiceStatus;
  issued_at: string | null;
};

type PaymentRow = {
  amount_cents: number;
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateBillingPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
}

async function getUserAndPractice() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    throw new Error("Create a workspace before managing billing.");
  }

  return { supabase, user, practice };
}

async function assertClientInPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
  practiceId: string,
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("practice_id", practiceId)
    .maybeSingle<{ id: string }>();

  if (error || !client) {
    throw new Error("The selected client could not be found.");
  }
}

async function assertAppointmentMatchesClient(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  appointmentId?: string;
  clientId: string;
  practiceId: string;
}) {
  if (!input.appointmentId) {
    return;
  }

  const { data: appointment, error } = await input.supabase
    .from("appointments")
    .select("id, client_id")
    .eq("id", input.appointmentId)
    .eq("practice_id", input.practiceId)
    .maybeSingle<{ id: string; client_id: string }>();

  if (error || !appointment) {
    throw new Error("The selected appointment could not be found.");
  }

  if (appointment.client_id !== input.clientId) {
    throw new Error("The selected appointment does not belong to the chosen client.");
  }
}

async function getInvoiceForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invoiceId: string,
  practiceId: string,
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, client_id, appointment_id, currency, total_cents, status, issued_at")
    .eq("id", invoiceId)
    .eq("practice_id", practiceId)
    .maybeSingle<InvoiceRow>();

  if (error || !invoice) {
    throw new Error("The selected invoice could not be found.");
  }

  return invoice;
}

async function getInvoicePaymentsTotal(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invoiceId: string,
  practiceId: string,
) {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("amount_cents")
    .eq("invoice_id", invoiceId)
    .eq("practice_id", practiceId);

  if (error) {
    throw new Error(error.message ?? "Unable to load invoice payments.");
  }

  return ((payments ?? []) as PaymentRow[]).reduce(
    (total, payment) => total + payment.amount_cents,
    0,
  );
}

async function syncInvoiceStatusFromPayments(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invoiceId: string,
  practiceId: string,
) {
  const invoice = await getInvoiceForPractice(supabase, invoiceId, practiceId);

  if (invoice.status === "void") {
    return;
  }

  const totalPaid = await getInvoicePaymentsTotal(supabase, invoiceId, practiceId);

  let nextStatus: InvoiceStatus;
  if (totalPaid >= invoice.total_cents && invoice.total_cents > 0) {
    nextStatus = "paid";
  } else if (totalPaid > 0) {
    nextStatus = "partial";
  } else if (invoice.issued_at) {
    nextStatus = "sent";
  } else {
    nextStatus = "draft";
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: nextStatus })
    .eq("id", invoiceId)
    .eq("practice_id", practiceId);

  if (error) {
    throw new Error(error.message ?? "Unable to sync invoice status.");
  }
}

export async function createInvoiceAction(
  input: InvoiceSchemaInput,
): Promise<ActionResult> {
  const parsed = InvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    await assertClientInPractice(supabase, parsed.data.clientId, practice.id);
    await assertAppointmentMatchesClient({
      supabase,
      appointmentId: parsed.data.appointmentId || undefined,
      clientId: parsed.data.clientId,
      practiceId: practice.id,
    });

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        practice_id: practice.id,
        client_id: parsed.data.clientId,
        appointment_id: normalizeOptionalString(parsed.data.appointmentId),
        session_id: null,
        invoice_number: parsed.data.invoiceNumber,
        currency: parsed.data.currency,
        subtotal_cents: parsed.data.subtotalCents,
        tax_cents: parsed.data.taxCents,
        status: parsed.data.status,
        issued_at: normalizeOptionalDate(parsed.data.issuedAt),
        due_at: normalizeOptionalDate(parsed.data.dueAt),
        notes: normalizeOptionalString(parsed.data.notes),
        created_by_user_id: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !invoice) {
      return {
        success: false,
        error: error?.message ?? "Unable to create the invoice.",
      };
    }

    await syncInvoiceStatusFromPayments(supabase, invoice.id, practice.id);
    revalidateBillingPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create the invoice.",
    };
  }
}

export async function updateInvoiceAction(
  input: UpdateInvoiceSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateInvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice details.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    await assertClientInPractice(supabase, parsed.data.clientId, practice.id);
    await assertAppointmentMatchesClient({
      supabase,
      appointmentId: parsed.data.appointmentId || undefined,
      clientId: parsed.data.clientId,
      practiceId: practice.id,
    });
    const currentInvoice = await getInvoiceForPractice(
      supabase,
      parsed.data.id,
      practice.id,
    );

    const { error } = await supabase
      .from("invoices")
      .update({
        client_id: parsed.data.clientId,
        appointment_id: normalizeOptionalString(parsed.data.appointmentId),
        invoice_number: parsed.data.invoiceNumber,
        currency: parsed.data.currency,
        subtotal_cents: parsed.data.subtotalCents,
        tax_cents: parsed.data.taxCents,
        status: parsed.data.status,
        issued_at: normalizeOptionalDate(parsed.data.issuedAt),
        due_at: normalizeOptionalDate(parsed.data.dueAt),
        notes: normalizeOptionalString(parsed.data.notes),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the invoice.",
      };
    }

    if (parsed.data.status !== "void" || currentInvoice.status !== "void") {
      await syncInvoiceStatusFromPayments(supabase, parsed.data.id, practice.id);
    }

    revalidateBillingPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the invoice.",
    };
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Invoice identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to delete the invoice.",
      };
    }

    revalidateBillingPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete the invoice.",
    };
  }
}

export async function createPaymentAction(
  input: PaymentSchemaInput,
): Promise<ActionResult> {
  const parsed = PaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid payment details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const invoice = await getInvoiceForPractice(
      supabase,
      parsed.data.invoiceId,
      practice.id,
    );

    if (invoice.status === "void") {
      return {
        success: false,
        error: "Void invoices cannot receive payments.",
      };
    }

    if (invoice.currency !== parsed.data.currency) {
      return {
        success: false,
        error: "Payment currency must match the invoice currency.",
      };
    }

    const totalPaid = await getInvoicePaymentsTotal(
      supabase,
      parsed.data.invoiceId,
      practice.id,
    );
    const outstanding = Math.max(0, invoice.total_cents - totalPaid);

    if (parsed.data.amountCents > outstanding) {
      return {
        success: false,
        error: "Payment amount cannot exceed the outstanding balance.",
      };
    }

    const { error } = await supabase.from("payments").insert({
      practice_id: practice.id,
      invoice_id: parsed.data.invoiceId,
      client_id: invoice.client_id,
      amount_cents: parsed.data.amountCents,
      currency: parsed.data.currency,
      payment_method: parsed.data.paymentMethod,
      external_reference: normalizeOptionalString(parsed.data.externalReference),
      paid_at: new Date(parsed.data.paidAt).toISOString(),
      recorded_by_user_id: user.id,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to record the payment.",
      };
    }

    await syncInvoiceStatusFromPayments(supabase, parsed.data.invoiceId, practice.id);
    revalidateBillingPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to record the payment.",
    };
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Payment identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("invoice_id")
      .eq("id", id)
      .eq("practice_id", practice.id)
      .maybeSingle<{ invoice_id: string }>();

    if (paymentLookupError || !payment) {
      return {
        success: false,
        error: "The selected payment could not be found.",
      };
    }

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to delete the payment.",
      };
    }

    await syncInvoiceStatusFromPayments(supabase, payment.invoice_id, practice.id);
    revalidateBillingPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete the payment.",
    };
  }
}
