"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTimeEntryAction } from "@/app/actions/time-entries";

export function TimeEntryDeleteButton({
  entryId,
  entryLabel,
}: {
  entryId: string;
  entryLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setErrorMessage(null);

          const confirmed = window.confirm(
            `Delete the time entry for ${entryLabel}?`,
          );

          if (!confirmed) {
            return;
          }

          startTransition(async () => {
            const result = await deleteTimeEntryAction(entryId);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to delete the time entry.");
              return;
            }

            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:border-destructive hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete entry"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
