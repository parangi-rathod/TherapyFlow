"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createDocumentRecordAction } from "@/app/actions/documents";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DocumentSchema,
  type DocumentSchemaInput,
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

type DocumentUploadFormProps = {
  practiceId: string;
  clientOptions: ClientOption[];
};

const CLIENT_DOCUMENT_BUCKET = "client-documents";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function DocumentUploadForm({
  practiceId,
  clientOptions,
}: DocumentUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<DocumentSchemaInput>({
    resolver: zodResolver(DocumentSchema),
    defaultValues: {
      clientId: clientOptions[0]?.id ?? "",
      title: "",
      documentType: "other",
      isClientVisible: false,
      storageBucket: CLIENT_DOCUMENT_BUCKET,
      storagePath: "pending",
      mimeType: "",
      fileSizeBytes: undefined,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setErrorMessage("Choose a file to upload.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("File size must be 20 MB or less.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const extension = file.name.includes(".")
        ? `.${file.name.split(".").pop()}`
        : "";
      const filename = sanitizeFilename(
        file.name.replace(extension, ""),
      );
      const storagePath = `${practiceId}/${values.clientId}/${Date.now()}-${filename}${extension}`;
      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(CLIENT_DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        setErrorMessage(uploadError.message);
        return;
      }

      const result = await createDocumentRecordAction({
        ...values,
        storageBucket: CLIENT_DOCUMENT_BUCKET,
        storagePath,
        mimeType: file.type || "",
        fileSizeBytes: file.size,
      });

      if (!result.success) {
        await supabase.storage.from(CLIENT_DOCUMENT_BUCKET).remove([storagePath]);
        setErrorMessage(result.error ?? "Unable to save the document record.");
        return;
      }

      setSuccessMessage("Document uploaded successfully.");
      form.reset({
        clientId: clientOptions[0]?.id ?? "",
        title: "",
        documentType: "other",
        isClientVisible: false,
        storageBucket: CLIENT_DOCUMENT_BUCKET,
        storagePath: "pending",
        mimeType: "",
        fileSizeBytes: undefined,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client" id="document-client" error={form.formState.errors.clientId?.message}>
          <select
            id="document-client"
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
        <Field label="Title" id="document-title" error={form.formState.errors.title?.message}>
          <input
            id="document-title"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("title")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Document type" id="document-type" error={form.formState.errors.documentType?.message}>
          <select
            id="document-type"
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
        <Field label="File" id="document-file">
          <input
            id="document-file"
            ref={fileInputRef}
            type="file"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 text-sm">
        <input type="checkbox" {...form.register("isClientVisible")} />
        Visible in the future client portal
      </label>

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
        {isPending ? "Uploading document..." : "Upload document"}
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
