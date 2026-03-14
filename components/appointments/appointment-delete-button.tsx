"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAppointmentAction } from "@/app/actions/appointments";

type AppointmentDeleteButtonProps = {
  appointmentId: string;
  appointmentLabel: string;
};

export function AppointmentDeleteButton({
  appointmentId,
  appointmentLabel,
}: AppointmentDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    const shouldDelete = window.confirm(
      `Delete appointment ${appointmentLabel}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteAppointmentAction(appointmentId);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to delete the appointment.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete appointment"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
