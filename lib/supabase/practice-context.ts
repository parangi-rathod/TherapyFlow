import type { SupabaseClient } from "@supabase/supabase-js";

type PracticeRow = {
  id: string;
  name: string;
  slug: string;
};

type PracticeMembershipRow = {
  practice_id: string;
  role: "owner" | "admin" | "therapist" | "billing";
  practices: PracticeRow | PracticeRow[] | null;
};

export type PracticeContext = PracticeRow & {
  role: "owner" | "admin" | "therapist" | "billing";
};

function unwrapPractice(
  practice: PracticeMembershipRow["practices"],
): PracticeRow | null {
  if (!practice) {
    return null;
  }

  if (Array.isArray(practice)) {
    return practice[0] ?? null;
  }

  return practice;
}

export async function getCurrentPracticeContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<PracticeContext | null> {
  const { data: ownedPractice, error: ownedPracticeError } = await supabase
    .from("practices")
    .select("id, name, slug")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<PracticeRow>();

  if (ownedPracticeError) {
    throw ownedPracticeError;
  }

  if (ownedPractice) {
    return {
      ...ownedPractice,
      role: "owner",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("practice_members")
    .select("practice_id, role, practices(id, name, slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<PracticeMembershipRow>();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return null;
  }

  const practice = unwrapPractice(membership.practices);

  if (!practice) {
    return null;
  }

  return {
    ...practice,
    role: membership.role,
  };
}
