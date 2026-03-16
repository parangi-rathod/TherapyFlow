"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { removeStaffMemberAction } from "@/app/actions/staff";

export function StaffMemberRemoveButton({
  membershipId,
  memberLabel,
  disabled = false,
}: {
  membershipId: string;
  memberLabel: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          setErrorMessage(null);

          const confirmed = window.confirm(
            `Remove ${memberLabel} from the practice staff roster?`,
          );

          if (!confirmed) {
            return;
          }

          startTransition(async () => {
            const result = await removeStaffMemberAction({ membershipId });

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to remove the staff member.");
              return;
            }

            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:border-destructive hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Removing..." : "Remove staff"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
