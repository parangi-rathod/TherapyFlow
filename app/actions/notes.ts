"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  NoteSchema,
  UpdateNoteSchema,
  type NoteSchemaInput,
  type UpdateNoteSchemaInput,
} from "@/lib/validations/note";

type ActionResult = {
  success: boolean;
  error?: string;
};

type AppointmentLookup = {
  id: string;
  client_id: string;
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTags(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildNoteContent(plainText: string) {
  return {
    type: "doc",
    blocks: [
      {
        type: "paragraph",
        text: plainText,
      },
    ],
  };
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
    throw new Error("Create a workspace before managing session notes.");
  }

  return { supabase, user, practice };
}

async function getAppointmentForPractice(
  appointmentId: string,
  practiceId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id, client_id")
    .eq("id", appointmentId)
    .eq("practice_id", practiceId)
    .maybeSingle<AppointmentLookup>();

  if (error || !appointment) {
    throw new Error("The selected appointment could not be found.");
  }

  return appointment;
}

export async function createSessionNoteAction(
  input: NoteSchemaInput,
): Promise<ActionResult> {
  const parsed = NoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session note details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const appointment = await getAppointmentForPractice(
      parsed.data.appointmentId,
      practice.id,
      supabase,
    );

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        practice_id: practice.id,
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        therapist_user_id: user.id,
        started_at: new Date(parsed.data.startsAt).toISOString(),
        ended_at: new Date(parsed.data.endsAt).toISOString(),
        duration_minutes: getDurationMinutes(
          parsed.data.startsAt,
          parsed.data.endsAt,
        ),
        status: parsed.data.sessionStatus,
      })
      .select("id")
      .single<{ id: string }>();

    if (sessionError || !session) {
      return {
        success: false,
        error: sessionError?.message ?? "Unable to create the session record.",
      };
    }

    const noteStatus = parsed.data.noteStatus;
    const { error: noteError } = await supabase.from("notes").insert({
      practice_id: practice.id,
      session_id: session.id,
      author_user_id: user.id,
      title: parsed.data.title,
      content: buildNoteContent(parsed.data.plainText),
      plain_text: parsed.data.plainText,
      tags: normalizeTags(parsed.data.tags),
      ai_summary: normalizeOptionalString(parsed.data.aiSummary),
      status: noteStatus,
      finalized_at:
        noteStatus === "final" ? new Date().toISOString() : null,
    });

    if (noteError) {
      return {
        success: false,
        error: noteError.message ?? "Unable to save the session note.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/notes");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the session note.",
    };
  }
}

export async function updateSessionNoteAction(
  input: UpdateNoteSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session note details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const appointment = await getAppointmentForPractice(
      parsed.data.appointmentId,
      practice.id,
      supabase,
    );

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        therapist_user_id: user.id,
        started_at: new Date(parsed.data.startsAt).toISOString(),
        ended_at: new Date(parsed.data.endsAt).toISOString(),
        duration_minutes: getDurationMinutes(
          parsed.data.startsAt,
          parsed.data.endsAt,
        ),
        status: parsed.data.sessionStatus,
      })
      .eq("id", parsed.data.sessionId)
      .eq("practice_id", practice.id);

    if (sessionError) {
      return {
        success: false,
        error: sessionError.message ?? "Unable to update the session record.",
      };
    }

    const noteStatus = parsed.data.noteStatus;
    const { error: noteError } = await supabase
      .from("notes")
      .update({
        title: parsed.data.title,
        content: buildNoteContent(parsed.data.plainText),
        plain_text: parsed.data.plainText,
        tags: normalizeTags(parsed.data.tags),
        ai_summary: normalizeOptionalString(parsed.data.aiSummary),
        status: noteStatus,
        finalized_at:
          noteStatus === "final" ? new Date().toISOString() : null,
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (noteError) {
      return {
        success: false,
        error: noteError.message ?? "Unable to update the session note.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/notes");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the session note.",
    };
  }
}
