"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { sendMessageAction } from "@/app/actions/messages";
import {
  SendMessageSchema,
  type SendMessageSchemaInput,
} from "@/lib/validations/message";

type MessageComposerFormProps = {
  threadId: string;
};

export function MessageComposerForm({ threadId }: MessageComposerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<SendMessageSchemaInput>({
    resolver: zodResolver(SendMessageSchema),
    defaultValues: {
      threadId,
      body: "",
      senderType: "therapist",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await sendMessageAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to send the message.");
        return;
      }

      setSuccessMessage(
        values.senderType === "client"
          ? "Client reply logged successfully."
          : "Message sent successfully.",
      );
      form.reset({
        threadId,
        body: "",
        senderType: values.senderType,
      });
      router.refresh();
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <Field
          id={`sender-type-${threadId}`}
          label="Message source"
          error={form.formState.errors.senderType?.message}
        >
          <select
            id={`sender-type-${threadId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("senderType")}
          >
            <option value="therapist">Therapist</option>
            <option value="client">Client reply</option>
          </select>
        </Field>
        <Field
          id={`message-body-${threadId}`}
          label="Message body"
          error={form.formState.errors.body?.message}
        >
          <textarea
            id={`message-body-${threadId}`}
            rows={4}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Write the next secure message for this thread."
            {...form.register("body")}
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
        {isPending ? "Saving message..." : "Save message"}
      </button>
    </form>
  );
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
