"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TimeEntrySchema,
  UpdateTimeEntrySchema,
  type TimeEntrySchemaInput,
  type UpdateTimeEntrySchemaInput,
} from "@/lib/validations/time-entry";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ClientRow = {
  id: string;
};

type SessionRow = {
  id: string;
  client_id: string;
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getDurationMinutes(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  return Math.max(0, Math.round((end - start) / 60000));
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
    throw new Error("Create a workspace before managing time tracking.");
  }

  return { supabase, user, practice };
}

async function getClientForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  practiceId: string,
  clientId: string,
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (error || !client) {
    throw new Error("The selected client could not be found.");
  }

  return client;
}

async function getSessionForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  practiceId: string,
  sessionId: string,
) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, client_id")
    .eq("practice_id", practiceId)
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (error || !session) {
    throw new Error("The selected session could not be found.");
  }

  return session;
}

function revalidateTimeTrackingPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notes");
  revalidatePath("/dashboard/time-tracking");
}

export async function createTimeEntryAction(
  input: TimeEntrySchemaInput,
): Promise<ActionResult> {
  const parsed = TimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid time entry details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    await getClientForPractice(supabase, practice.id, parsed.data.clientId);

    if (parsed.data.sessionId) {
      const session = await getSessionForPractice(
        supabase,
        practice.id,
        parsed.data.sessionId,
      );

      if (session.client_id !== parsed.data.clientId) {
        return {
          success: false,
          error: "The selected session does not belong to the selected client.",
        };
      }
    }

    const durationMinutes = getDurationMinutes(
      parsed.data.startsAt,
      parsed.data.endsAt,
    );

    const { error } = await supabase.from("time_entries").insert({
      practice_id: practice.id,
      client_id: parsed.data.clientId,
      session_id: parsed.data.sessionId || null,
      therapist_user_id: user.id,
      started_at: new Date(parsed.data.startsAt).toISOString(),
      ended_at: new Date(parsed.data.endsAt).toISOString(),
      duration_minutes: durationMinutes,
      is_billable: parsed.data.isBillable,
      billing_status: parsed.data.billingStatus,
      notes: normalizeOptionalString(parsed.data.notes),
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to create the time entry.",
      };
    }

    revalidateTimeTrackingPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to create the time entry.",
    };
  }
}

export async function updateTimeEntryAction(
  input: UpdateTimeEntrySchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateTimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid time entry details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    await getClientForPractice(supabase, practice.id, parsed.data.clientId);

    if (parsed.data.sessionId) {
      const session = await getSessionForPractice(
        supabase,
        practice.id,
        parsed.data.sessionId,
      );

      if (session.client_id !== parsed.data.clientId) {
        return {
          success: false,
          error: "The selected session does not belong to the selected client.",
        };
      }
    }

    const durationMinutes = getDurationMinutes(
      parsed.data.startsAt,
      parsed.data.endsAt,
    );

    const { error } = await supabase
      .from("time_entries")
      .update({
        client_id: parsed.data.clientId,
        session_id: parsed.data.sessionId || null,
        therapist_user_id: user.id,
        started_at: new Date(parsed.data.startsAt).toISOString(),
        ended_at: new Date(parsed.data.endsAt).toISOString(),
        duration_minutes: durationMinutes,
        is_billable: parsed.data.isBillable,
        billing_status: parsed.data.billingStatus,
        notes: normalizeOptionalString(parsed.data.notes),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the time entry.",
      };
    }

    revalidateTimeTrackingPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to update the time entry.",
    };
  }
}

export async function deleteTimeEntryAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Time entry identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to delete the time entry.",
      };
    }

    revalidateTimeTrackingPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to delete the time entry.",
    };
  }
}
