"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CreatePracticeSchema,
  type CreatePracticeSchemaInput,
} from "@/lib/validations/practice";

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createPracticeAction(
  input: CreatePracticeSchemaInput,
): Promise<ActionResult> {
  const parsed = CreatePracticeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid workspace details.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create a workspace.",
    };
  }

  const currentPractice = await getCurrentPracticeContext(supabase, user.id);

  if (currentPractice) {
    return {
      success: false,
      error: "A workspace already exists for this account.",
    };
  }

  const { data: practice, error: practiceError } = await supabase
    .from("practices")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      owner_user_id: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (practiceError || !practice) {
    return {
      success: false,
      error:
        practiceError?.code === "23505"
          ? "That workspace slug is already taken."
          : practiceError?.message ?? "Unable to create the workspace.",
    };
  }

  const { error: membershipError } = await supabase.from("practice_members").insert({
    practice_id: practice.id,
    user_id: user.id,
    role: "owner",
    status: "active",
    accepted_at: new Date().toISOString(),
  });

  if (membershipError) {
    return {
      success: false,
      error:
        membershipError.message ??
        "Workspace created, but owner membership could not be initialized.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");

  return {
    success: true,
  };
}
