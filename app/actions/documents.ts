"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DocumentSchema,
  UpdateDocumentSchema,
  type DocumentSchemaInput,
  type UpdateDocumentSchemaInput,
} from "@/lib/validations/document";

type ActionResult = {
  success: boolean;
  error?: string;
};

type StoredDocument = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getUserAndPractice() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    throw new Error("Create a workspace before managing documents.");
  }

  return { supabase, user, practice };
}

export async function createDocumentRecordAction(
  input: DocumentSchemaInput,
): Promise<ActionResult> {
  const parsed = DocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid document details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { error } = await supabase.from("documents").insert({
      practice_id: practice.id,
      client_id: parsed.data.clientId,
      uploaded_by_user_id: user.id,
      title: parsed.data.title,
      document_type: parsed.data.documentType,
      storage_bucket: parsed.data.storageBucket,
      storage_path: parsed.data.storagePath,
      mime_type: normalizeOptionalString(parsed.data.mimeType),
      file_size_bytes: parsed.data.fileSizeBytes ?? null,
      is_client_visible: parsed.data.isClientVisible,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to save the document record.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/documents");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save the document record.",
    };
  }
}

export async function updateDocumentRecordAction(
  input: UpdateDocumentSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid document details.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("documents")
      .update({
        client_id: parsed.data.clientId,
        title: parsed.data.title,
        document_type: parsed.data.documentType,
        is_client_visible: parsed.data.isClientVisible,
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the document record.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/documents");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the document record.",
    };
  }
}

export async function deleteDocumentRecordAction(
  id: string,
): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Document identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { data: document, error: lookupError } = await supabase
      .from("documents")
      .select("id, storage_bucket, storage_path")
      .eq("id", id)
      .eq("practice_id", practice.id)
      .maybeSingle<StoredDocument>();

    if (lookupError || !document) {
      return {
        success: false,
        error: lookupError?.message ?? "Document record not found.",
      };
    }

    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);

    if (storageError) {
      return {
        success: false,
        error: storageError.message ?? "Unable to delete the file from storage.",
      };
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message ?? "Unable to delete the document record.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/documents");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete the document.",
    };
  }
}
