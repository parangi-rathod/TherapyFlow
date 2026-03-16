"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { updateDocumentRecordAction } from "@/app/actions/documents";
import {
  UpdateDocumentSchema,
  type UpdateDocumentSchemaInput,
} from "@/lib/validations/document";

const documentTypeOptions = [
  { label: "Consent form", value: "consent_form" },
  { label: "Intake form", value: "intake_form" },
  { label: "Assessment", value: "assessment" },
  { label: "Report", value: "report" },
  { label: "Other", value: "other" },
] as const;

type ClientOption = {
  id: string;
  name: string;
};

type DocumentMetadataFormProps = {
  clientOptions: ClientOption[];
  initialValues: UpdateDocumentSchemaInput;
};

export function DocumentMetadataForm({
  clientOptions,
  initialValues,
}: DocumentMetadataFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<UpdateDocumentSchemaInput>({
    resolver: zodResolver(UpdateDocumentSchema),
    defaultValues: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateDocumentRecordAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to update the document.");
        return;
      }

      setSuccessMessage("Document updated successfully.");
      router.refresh();
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client" id={`document-client-${initialValues.id}`} error={form.formState.errors.clientId?.message}>
          <select
            id={`document-client-${initialValues.id}`}
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
        <Field label="Title" id={`document-title-${initialValues.id}`} error={form.formState.errors.title?.message}>
          <input
            id={`document-title-${initialValues.id}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("title")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Document type" id={`document-type-${initialValues.id}`} error={form.formState.errors.documentType?.message}>
          <select
            id={`document-type-${initialValues.id}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("documentType")}
          >
            {documentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 text-sm">
          <input type="checkbox" {...form.register("isClientVisible")} />
          Visible in the future client portal
        </label>
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
        {isPending ? "Saving metadata..." : "Save metadata"}
      </button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
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
