"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { processEmailRemindersAction } from "@/app/actions/reminders";

export function ProcessEmailRemindersButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setErrorMessage(null);
          setSuccessMessage(null);

          startTransition(async () => {
            const result = await processEmailRemindersAction();

            if (!result.success) {
              setErrorMessage(
                result.error ?? "Unable to process due email reminders.",
              );
              return;
            }

            setSuccessMessage(
              `Processed ${result.processed ?? 0} due emails. Sent ${result.sent ?? 0}, failed ${result.failed ?? 0}, cancelled ${result.cancelled ?? 0}.`,
            );
            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Processing due emails..." : "Process due email reminders"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-primary">{successMessage}</p>
      ) : null}
    </div>
  );
}
