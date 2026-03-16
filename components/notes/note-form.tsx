"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createSessionNoteAction,
  updateSessionNoteAction,
} from "@/app/actions/notes";
import { NoteSchema, type NoteSchemaInput } from "@/lib/validations/note";

const sessionStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const noteStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Final", value: "final" },
] as const;

export type NoteFormValues = NoteSchemaInput & {
  id?: string;
  sessionId?: string;
};

type AppointmentOption = {
  id: string;
  label: string;
};

type NoteFormProps = {
  mode: "create" | "edit";
  appointmentOptions: AppointmentOption[];
  initialValues: NoteFormValues;
};

export function NoteForm({
  mode,
  appointmentOptions,
  initialValues,
}: NoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<NoteSchemaInput>({
    resolver: zodResolver(NoteSchema),
    defaultValues: {
      appointmentId: initialValues.appointmentId,
      startsAt: initialValues.startsAt,
      endsAt: initialValues.endsAt,
      sessionStatus: initialValues.sessionStatus,
      title: initialValues.title,
      plainText: initialValues.plainText,
      tags: initialValues.tags ?? "",
      aiSummary: initialValues.aiSummary ?? "",
      noteStatus: initialValues.noteStatus,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSessionNoteAction(values)
          : await updateSessionNoteAction({
              id: initialValues.id ?? "",
              sessionId: initialValues.sessionId ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the note.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Session note created successfully."
          : "Session note updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          appointmentId: appointmentOptions[0]?.id ?? "",
          startsAt: "",
          endsAt: "",
          sessionStatus: "completed",
          title: "",
          plainText: "",
          tags: "",
          aiSummary: "",
          noteStatus: "draft",
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Appointment" id={`${mode}-appointment`} error={form.formState.errors.appointmentId?.message}>
          <select
            id={`${mode}-appointment`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("appointmentId")}
          >
            {appointmentOptions.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Session title" id={`${mode}-title`} error={form.formState.errors.title?.message}>
          <input
            id={`${mode}-title`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("title")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Session start" id={`${mode}-starts-at`} error={form.formState.errors.startsAt?.message}>
          <input
            id={`${mode}-starts-at`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("startsAt")}
          />
        </Field>
        <Field label="Session end" id={`${mode}-ends-at`} error={form.formState.errors.endsAt?.message}>
          <input
            id={`${mode}-ends-at`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("endsAt")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Session status" id={`${mode}-session-status`} error={form.formState.errors.sessionStatus?.message}>
          <select
            id={`${mode}-session-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("sessionStatus")}
          >
            {sessionStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note status" id={`${mode}-note-status`} error={form.formState.errors.noteStatus?.message}>
          <select
            id={`${mode}-note-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("noteStatus")}
          >
            {noteStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Session note" id={`${mode}-plain-text`} error={form.formState.errors.plainText?.message}>
        <textarea
          id={`${mode}-plain-text`}
          rows={8}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("plainText")}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tags" id={`${mode}-tags`} error={form.formState.errors.tags?.message}>
          <input
            id={`${mode}-tags`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="progress, intake, anxiety"
            {...form.register("tags")}
          />
        </Field>
        <Field label="AI summary" id={`${mode}-ai-summary`} error={form.formState.errors.aiSummary?.message}>
          <textarea
            id={`${mode}-ai-summary`}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("aiSummary")}
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
        {isPending
          ? mode === "create"
            ? "Saving note..."
            : "Updating note..."
          : mode === "create"
            ? "Create note"
            : "Save changes"}
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
