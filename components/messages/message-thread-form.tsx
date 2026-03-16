"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createMessageThreadAction } from "@/app/actions/messages";
import {
  MessageThreadSchema,
  type MessageThreadSchemaInput,
} from "@/lib/validations/message";

type ClientOption = {
  id: string;
  name: string;
};

type MessageThreadFormProps = {
  clientOptions: ClientOption[];
};

export function MessageThreadForm({
  clientOptions,
}: MessageThreadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<MessageThreadSchemaInput>({
    resolver: zodResolver(MessageThreadSchema),
    defaultValues: {
      clientId: clientOptions[0]?.id ?? "",
      subject: "",
      initialMessage: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createMessageThreadAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to create the thread.");
        return;
      }

      setSuccessMessage("Secure thread created successfully.");
      form.reset({
        clientId: clientOptions[0]?.id ?? "",
        subject: "",
        initialMessage: "",
      });
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <Field
          id="message-thread-client"
          label="Client"
          error={form.formState.errors.clientId?.message}
        >
          <select
            id="message-thread-client"
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
          id="message-thread-subject"
          label="Subject"
          error={form.formState.errors.subject?.message}
        >
          <input
            id="message-thread-subject"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Treatment plan follow-up"
            {...form.register("subject")}
          />
        </Field>
      </div>

      <Field
        id="message-thread-initial"
        label="Opening message"
        error={form.formState.errors.initialMessage?.message}
      >
        <textarea
          id="message-thread-initial"
          rows={5}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Write the first secure message for this thread."
          {...form.register("initialMessage")}
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
        disabled={isPending || clientOptions.length === 0}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating secure thread..." : "Create secure thread"}
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
