"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ClientSchema,
  UpdateClientSchema,
  type ClientSchemaInput,
  type UpdateClientSchemaInput,
} from "@/lib/validations/client";

type ActionResult = {
  success: boolean;
  error?: string;
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
    throw new Error("Create a workspace before managing clients.");
  }

  return { supabase, user, practice };
}

export async function createClientAction(
  input: ClientSchemaInput,
): Promise<ActionResult> {
  const parsed = ClientSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid client details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { error } = await supabase.from("clients").insert({
      practice_id: practice.id,
      primary_therapist_user_id: user.id,
      created_by_user_id: user.id,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      date_of_birth: normalizeOptionalString(parsed.data.dateOfBirth),
      email: normalizeOptionalString(parsed.data.email),
      phone: normalizeOptionalString(parsed.data.phone),
      emergency_contact_name: normalizeOptionalString(
        parsed.data.emergencyContactName,
      ),
      emergency_contact_phone: normalizeOptionalString(
        parsed.data.emergencyContactPhone,
      ),
      emergency_contact_relationship: normalizeOptionalString(
        parsed.data.emergencyContactRelationship,
      ),
      therapy_history: normalizeOptionalString(parsed.data.therapyHistory),
      status: parsed.data.status,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to create the client.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create the client.",
    };
  }
}

export async function updateClientAction(
  input: UpdateClientSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateClientSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid client details.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("clients")
      .update({
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        date_of_birth: normalizeOptionalString(parsed.data.dateOfBirth),
        email: normalizeOptionalString(parsed.data.email),
        phone: normalizeOptionalString(parsed.data.phone),
        emergency_contact_name: normalizeOptionalString(
          parsed.data.emergencyContactName,
        ),
        emergency_contact_phone: normalizeOptionalString(
          parsed.data.emergencyContactPhone,
        ),
        emergency_contact_relationship: normalizeOptionalString(
          parsed.data.emergencyContactRelationship,
        ),
        therapy_history: normalizeOptionalString(parsed.data.therapyHistory),
        status: parsed.data.status,
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the client.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the client.",
    };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Client identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to delete the client.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete the client.",
    };
  }
}
