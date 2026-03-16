"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createTimeEntryAction,
  updateTimeEntryAction,
} from "@/app/actions/time-entries";
import {
  TimeEntrySchema,
  type TimeEntrySchemaInput,
} from "@/lib/validations/time-entry";

const billableStatusOptions = [
  { label: "Unbilled", value: "unbilled" },
  { label: "Ready to bill", value: "ready" },
  { label: "Billed", value: "billed" },
] as const;

export type TimeEntryFormValues = TimeEntrySchemaInput & {
  id?: string;
};

type ClientOption = {
  id: string;
  name: string;
};

type SessionOption = {
  id: string;
  clientId: string;
  label: string;
  startsAt: string;
  endsAt: string;
};

type TimeEntryFormProps = {
  mode: "create" | "edit";
  clientOptions: ClientOption[];
  sessionOptions: SessionOption[];
  initialValues: TimeEntryFormValues;
};

export function TimeEntryForm({
  mode,
  clientOptions,
  sessionOptions,
  initialValues,
}: TimeEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<TimeEntrySchemaInput>({
    resolver: zodResolver(TimeEntrySchema),
    defaultValues: {
      clientId: initialValues.clientId,
      sessionId: initialValues.sessionId ?? "",
      startsAt: initialValues.startsAt,
      endsAt: initialValues.endsAt,
      isBillable: initialValues.isBillable,
      billingStatus: initialValues.billingStatus,
      notes: initialValues.notes ?? "",
    },
  });
  const selectedSessionId = form.watch("sessionId");
  const isBillable = form.watch("isBillable");

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const session = sessionOptions.find((option) => option.id === selectedSessionId);

    if (!session) {
      return;
    }

    form.setValue("clientId", session.clientId);
    form.setValue("startsAt", session.startsAt);
    form.setValue("endsAt", session.endsAt);
  }, [form, selectedSessionId, sessionOptions]);

  useEffect(() => {
    if (!isBillable) {
      form.setValue("billingStatus", "non_billable");
      return;
    }

    if (form.getValues("billingStatus") === "non_billable") {
      form.setValue("billingStatus", "unbilled");
    }
  }, [form, isBillable]);

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTimeEntryAction(values)
          : await updateTimeEntryAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the time entry.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Time entry created successfully."
          : "Time entry updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          clientId: clientOptions[0]?.id ?? "",
          sessionId: "",
          startsAt: "",
          endsAt: "",
          isBillable: true,
          billingStatus: "unbilled",
          notes: "",
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <Field
          id={`${mode}-time-client`}
          label="Client"
          error={toFieldError(form.formState.errors.clientId?.message)}
        >
          <select
            id={`${mode}-time-client`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("clientId")}
          >
            {clientOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${mode}-time-session`}
          label="Linked session"
          error={toFieldError(form.formState.errors.sessionId?.message)}
        >
          <select
            id={`${mode}-time-session`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("sessionId")}
          >
            <option value="">No linked session</option>
            {sessionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-time-start`}
          label="Start time"
          error={toFieldError(form.formState.errors.startsAt?.message)}
        >
          <input
            id={`${mode}-time-start`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("startsAt")}
          />
        </Field>
        <Field
          id={`${mode}-time-end`}
          label="End time"
          error={toFieldError(form.formState.errors.endsAt?.message)}
        >
          <input
            id={`${mode}-time-end`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("endsAt")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-[180px_220px]">
        <Field
          id={`${mode}-time-billable`}
          label="Billable"
          error={toFieldError(form.formState.errors.isBillable?.message)}
        >
          <select
            id={`${mode}-time-billable`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("isBillable", {
              setValueAs: (value) => value === "true",
            })}
          >
            <option value="true">Billable</option>
            <option value="false">Non-billable</option>
          </select>
        </Field>
        <Field
          id={`${mode}-time-billing-status`}
          label="Billing status"
          error={toFieldError(form.formState.errors.billingStatus?.message)}
        >
          <select
            id={`${mode}-time-billing-status`}
            disabled={!isBillable}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            {...form.register("billingStatus")}
          >
            {!isBillable ? (
              <option value="non_billable">Non-billable</option>
            ) : null}
            {billableStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id={`${mode}-time-notes`}
        label="Notes"
        error={toFieldError(form.formState.errors.notes?.message)}
      >
        <textarea
          id={`${mode}-time-notes`}
          rows={4}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Document what work was completed and any billing context."
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
            ? "Saving time entry..."
            : "Updating time entry..."
          : mode === "create"
            ? "Create time entry"
            : "Save changes"}
      </button>
    </form>
  );
}

function toFieldError(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
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
