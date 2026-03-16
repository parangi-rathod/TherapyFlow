"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePaymentAction } from "@/app/actions/billing";

type PaymentDeleteButtonProps = {
  paymentId: string;
  paymentLabel: string;
};

export function PaymentDeleteButton({
  paymentId,
  paymentLabel,
}: PaymentDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm(`Delete payment ${paymentLabel}?`);

          if (!confirmed) {
            return;
          }

          setErrorMessage(null);
          startTransition(async () => {
            const result = await deletePaymentAction(paymentId);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to delete the payment.");
              return;
            }

            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting payment..." : "Delete payment"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
