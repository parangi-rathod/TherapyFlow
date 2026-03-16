"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { reviewIntakeSubmissionAction } from "@/app/actions/intake-forms";
import {
  IntakeSubmissionReviewSchema,
  type IntakeSubmissionReviewSchemaInput,
} from "@/lib/validations/intake-form";

type IntakeReviewFormProps = {
  submissionId: string;
  initialReviewNotes: string;
};

export function IntakeReviewForm({
  submissionId,
  initialReviewNotes,
}: IntakeReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<IntakeSubmissionReviewSchemaInput>({
    resolver: zodResolver(IntakeSubmissionReviewSchema),
    defaultValues: {
      submissionId,
      reviewNotes: initialReviewNotes,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await reviewIntakeSubmissionAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the review.");
        return;
      }

      setSuccessMessage("Review saved successfully.");
      router.refresh();
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field
        id={`review-notes-${submissionId}`}
        label="Review notes"
        error={form.formState.errors.reviewNotes?.message}
      >
        <textarea
          id={`review-notes-${submissionId}`}
          rows={4}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("reviewNotes")}
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
        {isPending ? "Saving review..." : "Save review"}
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
