"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteDocumentRecordAction } from "@/app/actions/documents";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type DocumentActionsProps = {
  documentId: string;
  documentTitle: string;
  storageBucket: string;
  storagePath: string;
};

export function DocumentActions({
  documentId,
  documentTitle,
  storageBucket,
  storagePath,
}: DocumentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpen = async () => {
    setErrorMessage(null);

    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, 60);

    if (error || !data?.signedUrl) {
      setErrorMessage(error?.message ?? "Unable to open the document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = () => {
    const shouldDelete = window.confirm(
      `Delete ${documentTitle}? This removes the file and its document record.`,
    );

    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteDocumentRecordAction(documentId);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to delete the document.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          Open file
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Deleting..." : "Delete document"}
        </button>
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
