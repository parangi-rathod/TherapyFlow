"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelReminderAction } from "@/app/actions/reminders";

type ReminderCancelButtonProps = {
  reminderId: string;
  reminderLabel: string;
};

export function ReminderCancelButton({
  reminderId,
  reminderLabel,
}: ReminderCancelButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          const confirmed = window.confirm(
            `Cancel the reminder for ${reminderLabel}?`,
          );

          if (!confirmed) {
            return;
          }

          setErrorMessage(null);

          startTransition(async () => {
            const result = await cancelReminderAction(reminderId);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to cancel reminder.");
              return;
            }

            router.refresh();
          });
        }}
      >
        {isPending ? "Cancelling..." : "Cancel reminder"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
