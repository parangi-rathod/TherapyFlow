"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createPaymentAction } from "@/app/actions/billing";
import { PaymentSchema, type PaymentSchemaInput } from "@/lib/validations/billing";

const paymentMethodOptions = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "ACH", value: "ach" },
  { label: "Manual", value: "manual" },
  { label: "Other", value: "other" },
] as const;

type PaymentFormProps = {
  invoiceId: string;
  currency: string;
  suggestedAmountCents: number;
};

export function PaymentForm({
  invoiceId,
  currency,
  suggestedAmountCents,
}: PaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<PaymentSchemaInput>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      invoiceId,
      amountCents: suggestedAmountCents,
      currency,
      paymentMethod: "manual",
      externalReference: "",
      paidAt: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createPaymentAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to record the payment.");
        return;
      }

      setSuccessMessage("Payment recorded successfully.");
      form.reset({
        invoiceId,
        amountCents: suggestedAmountCents,
        currency,
        paymentMethod: "manual",
        externalReference: "",
        paidAt: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <input type="hidden" {...form.register("invoiceId")} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          id={`payment-amount-${invoiceId}`}
          label="Amount (cents)"
          error={form.formState.errors.amountCents?.message}
        >
          <input
            id={`payment-amount-${invoiceId}`}
            type="number"
            min={1}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("amountCents", { valueAsNumber: true })}
          />
        </Field>
        <Field
          id={`payment-currency-${invoiceId}`}
          label="Currency"
          error={form.formState.errors.currency?.message}
        >
          <input
            id={`payment-currency-${invoiceId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("currency")}
          />
        </Field>
        <Field
          id={`payment-date-${invoiceId}`}
          label="Paid date"
          error={form.formState.errors.paidAt?.message}
        >
          <input
            id={`payment-date-${invoiceId}`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("paidAt")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`payment-method-${invoiceId}`}
          label="Payment method"
          error={form.formState.errors.paymentMethod?.message}
        >
          <select
            id={`payment-method-${invoiceId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("paymentMethod")}
          >
            {paymentMethodOptions.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`payment-reference-${invoiceId}`}
          label="Reference"
          error={form.formState.errors.externalReference?.message}
        >
          <input
            id={`payment-reference-${invoiceId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("externalReference")}
          />
        </Field>
      </div>

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
        {isPending ? "Recording payment..." : "Record payment"}
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
