"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteClientAction } from "@/app/actions/clients";

type ClientDeleteButtonProps = {
  clientId: string;
  clientName: string;
};

export function ClientDeleteButton({
  clientId,
  clientName,
}: ClientDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    const shouldDelete = window.confirm(
      `Delete ${clientName}? This removes the client record permanently.`,
    );

    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteClientAction(clientId);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to delete the client.");
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
        {isPending ? "Deleting..." : "Delete client"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
