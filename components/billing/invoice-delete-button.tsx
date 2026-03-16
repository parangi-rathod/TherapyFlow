"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteInvoiceAction } from "@/app/actions/billing";

type InvoiceDeleteButtonProps = {
  invoiceId: string;
  invoiceNumber: string;
};

export function InvoiceDeleteButton({
  invoiceId,
  invoiceNumber,
}: InvoiceDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm(
            `Delete invoice ${invoiceNumber}? This will also remove its payments.`,
          );

          if (!confirmed) {
            return;
          }

          setErrorMessage(null);
          startTransition(async () => {
            const result = await deleteInvoiceAction(invoiceId);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to delete the invoice.");
              return;
            }

            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting invoice..." : "Delete invoice"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
