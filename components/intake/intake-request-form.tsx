"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createIntakeRequestAction } from "@/app/actions/intake-forms";
import {
  IntakeRequestSchema,
  type IntakeRequestSchemaInput,
} from "@/lib/validations/intake-form";

type ClientOption = {
  id: string;
  name: string;
};

type FormOption = {
  id: string;
  name: string;
};

type IntakeRequestFormProps = {
  clientOptions: ClientOption[];
  formOptions: FormOption[];
};

export function IntakeRequestForm({
  clientOptions,
  formOptions,
}: IntakeRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const form = useForm<IntakeRequestSchemaInput>({
    resolver: zodResolver(IntakeRequestSchema),
    defaultValues: {
      intakeFormId: formOptions[0]?.id ?? "",
      clientId: clientOptions[0]?.id ?? "",
      expiresAt: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSharePath(null);

    startTransition(async () => {
      const result = await createIntakeRequestAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to create the intake request.");
        return;
      }

      setSuccessMessage("Intake request created successfully.");
      setSharePath(result.sharePath ?? null);
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="intake-request-form"
          label="Form"
          error={form.formState.errors.intakeFormId?.message}
        >
          <select
            id="intake-request-form"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("intakeFormId")}
          >
            {formOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="intake-request-client"
          label="Client"
          error={form.formState.errors.clientId?.message}
        >
          <select
            id="intake-request-client"
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
      </div>

      <Field
        id="intake-request-expiry"
        label="Expiration date"
        error={form.formState.errors.expiresAt?.message}
      >
        <input
          id="intake-request-expiry"
          type="date"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("expiresAt")}
        />
      </Field>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          <p>{successMessage}</p>
          {sharePath ? (
            <p className="mt-2 break-all text-xs text-primary/80">{sharePath}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating request..." : "Create intake request"}
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
