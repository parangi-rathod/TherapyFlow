"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AppointmentSchema,
  UpdateAppointmentSchema,
  type AppointmentSchemaInput,
  type UpdateAppointmentSchemaInput,
} from "@/lib/validations/appointment";

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
    throw new Error("Create a workspace before managing appointments.");
  }

  return { supabase, user, practice };
}

export async function createAppointmentAction(
  input: AppointmentSchemaInput,
): Promise<ActionResult> {
  const parsed = AppointmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid appointment details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { error } = await supabase.from("appointments").insert({
      practice_id: practice.id,
      client_id: parsed.data.clientId,
      therapist_user_id: user.id,
      starts_at: new Date(parsed.data.startsAt).toISOString(),
      ends_at: new Date(parsed.data.endsAt).toISOString(),
      timezone: parsed.data.timezone,
      status: parsed.data.status,
      location_type: parsed.data.locationType,
      location_details: normalizeOptionalString(parsed.data.locationDetails),
      meeting_url: normalizeOptionalString(parsed.data.meetingUrl),
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to create the appointment.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the appointment.",
    };
  }
}

export async function updateAppointmentAction(
  input: UpdateAppointmentSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateAppointmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid appointment details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("appointments")
      .update({
        client_id: parsed.data.clientId,
        therapist_user_id: user.id,
        starts_at: new Date(parsed.data.startsAt).toISOString(),
        ends_at: new Date(parsed.data.endsAt).toISOString(),
        timezone: parsed.data.timezone,
        status: parsed.data.status,
        location_type: parsed.data.locationType,
        location_details: normalizeOptionalString(parsed.data.locationDetails),
        meeting_url: normalizeOptionalString(parsed.data.meetingUrl),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the appointment.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the appointment.",
    };
  }
}

export async function deleteAppointmentAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Appointment identifier is required.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to delete the appointment.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete the appointment.",
    };
  }
}
