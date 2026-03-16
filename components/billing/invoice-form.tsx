"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/app/actions/billing";
import { InvoiceSchema, type InvoiceSchemaInput } from "@/lib/validations/billing";

const invoiceStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Void", value: "void" },
] as const;

export type InvoiceFormValues = InvoiceSchemaInput & {
  id?: string;
};

type ClientOption = {
  id: string;
  name: string;
};

type AppointmentOption = {
  id: string;
  label: string;
};

type InvoiceFormProps = {
  mode: "create" | "edit";
  clientOptions: ClientOption[];
  appointmentOptions: AppointmentOption[];
  initialValues: InvoiceFormValues;
};

export function InvoiceForm({
  mode,
  clientOptions,
  appointmentOptions,
  initialValues,
}: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<InvoiceSchemaInput>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createInvoiceAction(values)
          : await updateInvoiceAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the invoice.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Invoice created successfully."
          : "Invoice updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          clientId: clientOptions[0]?.id ?? "",
          appointmentId: "",
          invoiceNumber: "",
          currency: "USD",
          subtotalCents: 0,
          taxCents: 0,
          status: "draft",
          issuedAt: "",
          dueAt: "",
          notes: "",
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-invoice-client`}
          label="Client"
          error={form.formState.errors.clientId?.message}
        >
          <select
            id={`${mode}-invoice-client`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("clientId")}
          >
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${mode}-invoice-appointment`}
          label="Appointment"
          error={form.formState.errors.appointmentId?.message}
        >
          <select
            id={`${mode}-invoice-appointment`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("appointmentId")}
          >
            <option value="">No linked appointment</option>
            {appointmentOptions.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          id={`${mode}-invoice-number`}
          label="Invoice number"
          error={form.formState.errors.invoiceNumber?.message}
        >
          <input
            id={`${mode}-invoice-number`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("invoiceNumber")}
          />
        </Field>
        <Field
          id={`${mode}-invoice-currency`}
          label="Currency"
          error={form.formState.errors.currency?.message}
        >
          <input
            id={`${mode}-invoice-currency`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("currency")}
          />
        </Field>
        <Field
          id={`${mode}-invoice-status`}
          label="Status"
          error={form.formState.errors.status?.message}
        >
          <select
            id={`${mode}-invoice-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("status")}
          >
            {invoiceStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-subtotal`}
          label="Subtotal (cents)"
          error={form.formState.errors.subtotalCents?.message}
        >
          <input
            id={`${mode}-subtotal`}
            type="number"
            min={0}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("subtotalCents", { valueAsNumber: true })}
          />
        </Field>
        <Field
          id={`${mode}-tax`}
          label="Tax (cents)"
          error={form.formState.errors.taxCents?.message}
        >
          <input
            id={`${mode}-tax`}
            type="number"
            min={0}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("taxCents", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-issued-at`}
          label="Issued date"
          error={form.formState.errors.issuedAt?.message}
        >
          <input
            id={`${mode}-issued-at`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("issuedAt")}
          />
        </Field>
        <Field
          id={`${mode}-due-at`}
          label="Due date"
          error={form.formState.errors.dueAt?.message}
        >
          <input
            id={`${mode}-due-at`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("dueAt")}
          />
        </Field>
      </div>

      <Field
        id={`${mode}-invoice-notes`}
        label="Notes"
        error={form.formState.errors.notes?.message}
      >
        <textarea
          id={`${mode}-invoice-notes`}
          rows={4}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("notes")}
        />
      </Field>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? mode === "create"
            ? "Saving invoice..."
            : "Updating invoice..."
          : mode === "create"
            ? "Create invoice"
            : "Save invoice"}
      </button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
