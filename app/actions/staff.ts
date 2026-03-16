"use server";

import { revalidatePath } from "next/cache";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AddStaffMemberSchema,
  RemoveStaffMemberSchema,
  UpdateStaffMemberSchema,
  type AddStaffMemberSchemaInput,
  type RemoveStaffMemberSchemaInput,
  type UpdateStaffMemberSchemaInput,
} from "@/lib/validations/staff";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ProfileLookupRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type MembershipLookupRow = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "therapist" | "billing";
  status: "invited" | "active" | "disabled";
};

async function getAuthorizedPracticeAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    throw new Error("Create a workspace before managing staff.");
  }

  if (practice.role !== "owner" && practice.role !== "admin") {
    throw new Error("Only owners and admins can manage practice staff.");
  }

  return { supabase, user, practice };
}

async function getMembershipForPractice(
  membershipId: string,
  practiceId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  const { data: membership, error } = await supabase
    .from("practice_members")
    .select("id, user_id, role, status")
    .eq("id", membershipId)
    .eq("practice_id", practiceId)
    .maybeSingle<MembershipLookupRow>();

  if (error || !membership) {
    throw new Error("The selected staff membership could not be found.");
  }

  return membership;
}

function revalidateStaffPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
}

export async function addStaffMemberAction(
  input: AddStaffMemberSchemaInput,
): Promise<ActionResult> {
  const parsed = AddStaffMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff details.",
    };
  }

  try {
    const { supabase, practice } = await getAuthorizedPracticeAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", normalizedEmail)
      .maybeSingle<ProfileLookupRow>();

    if (profileError || !profile) {
      return {
        success: false,
        error:
          "That email does not belong to an existing TherapyFlow user yet. Have them sign up first, then add them to the practice.",
      };
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from("practice_members")
      .select("id, status")
      .eq("practice_id", practice.id)
      .eq("user_id", profile.id)
      .maybeSingle<{ id: string; status: "invited" | "active" | "disabled" }>();

    if (membershipLookupError) {
      return {
        success: false,
        error:
          membershipLookupError.message ??
          "Unable to check the current staff roster.",
      };
    }

    if (existingMembership) {
      return {
        success: false,
        error: `This user is already on the practice roster with status ${existingMembership.status}.`,
      };
    }

    const acceptedAt =
      parsed.data.status === "active" ? new Date().toISOString() : null;
    const { error } = await supabase.from("practice_members").insert({
      practice_id: practice.id,
      user_id: profile.id,
      role: parsed.data.role,
      status: parsed.data.status,
      invited_at: new Date().toISOString(),
      accepted_at: acceptedAt,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to add the staff member.",
      };
    }

    revalidateStaffPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to add the staff member.",
    };
  }
}

export async function updateStaffMemberAction(
  input: UpdateStaffMemberSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateStaffMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff details.",
    };
  }

  try {
    const { supabase, user, practice } = await getAuthorizedPracticeAdmin();
    const membership = await getMembershipForPractice(
      parsed.data.membershipId,
      practice.id,
      supabase,
    );

    if (membership.role === "owner") {
      return {
        success: false,
        error: "Owner membership cannot be edited from the staff roster.",
      };
    }

    if (membership.user_id === user.id && parsed.data.status === "disabled") {
      return {
        success: false,
        error: "You cannot disable your own active admin access.",
      };
    }

    const { error } = await supabase
      .from("practice_members")
      .update({
        role: parsed.data.role,
        status: parsed.data.status,
        accepted_at:
          parsed.data.status === "active" ? new Date().toISOString() : null,
      })
      .eq("id", parsed.data.membershipId)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the staff member.",
      };
    }

    revalidateStaffPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to update the staff member.",
    };
  }
}

export async function removeStaffMemberAction(
  input: RemoveStaffMemberSchemaInput,
): Promise<ActionResult> {
  const parsed = RemoveStaffMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff details.",
    };
  }

  try {
    const { supabase, user, practice } = await getAuthorizedPracticeAdmin();
    const membership = await getMembershipForPractice(
      parsed.data.membershipId,
      practice.id,
      supabase,
    );

    if (membership.role === "owner") {
      return {
        success: false,
        error: "Owner membership cannot be removed from the staff roster.",
      };
    }

    if (membership.user_id === user.id) {
      return {
        success: false,
        error: "You cannot remove your own active admin access.",
      };
    }

    const { error } = await supabase
      .from("practice_members")
      .delete()
      .eq("id", parsed.data.membershipId)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to remove the staff member.",
      };
    }

    revalidateStaffPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to remove the staff member.",
    };
  }
}
