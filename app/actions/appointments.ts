"use server";

import { revalidatePath } from "next/cache";

import { syncAppointmentReminders } from "@/app/actions/reminders";
import { sendAppointmentNotificationEmail } from "@/lib/reminders/delivery";
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

type ClientNotificationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

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

async function getClientForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
  practiceId: string,
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email")
    .eq("id", clientId)
    .eq("practice_id", practiceId)
    .maybeSingle<ClientNotificationRow>();

  if (error || !client) {
    throw new Error("The selected client could not be found.");
  }

  return client;
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
    const client = await getClientForPractice(
      supabase,
      parsed.data.clientId,
      practice.id,
    );
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

    if (client.email?.trim()) {
      try {
        await sendAppointmentNotificationEmail({
          to: client.email.trim(),
          practiceName: practice.name,
          clientName: `${client.first_name} ${client.last_name}`.trim(),
          startsAt: new Date(parsed.data.startsAt).toISOString(),
          timezone: parsed.data.timezone,
          locationType: parsed.data.locationType,
          locationDetails: normalizeOptionalString(parsed.data.locationDetails),
          meetingUrl: normalizeOptionalString(parsed.data.meetingUrl),
          status: parsed.data.status,
          idempotencyKey: `appointment-created/${practice.id}/${client.id}/${new Date(parsed.data.startsAt).toISOString()}/${parsed.data.status}`,
        });
      } catch {
        // Appointment creation should still succeed if the notification provider fails.
      }
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
    const client = await getClientForPractice(
      supabase,
      parsed.data.clientId,
      practice.id,
    );
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

    await syncAppointmentReminders(supabase, parsed.data.id, practice.id);

    if (client.email?.trim()) {
      try {
        await sendAppointmentNotificationEmail({
          to: client.email.trim(),
          practiceName: practice.name,
          clientName: `${client.first_name} ${client.last_name}`.trim(),
          startsAt: new Date(parsed.data.startsAt).toISOString(),
          timezone: parsed.data.timezone,
          locationType: parsed.data.locationType,
          locationDetails: normalizeOptionalString(parsed.data.locationDetails),
          meetingUrl: normalizeOptionalString(parsed.data.meetingUrl),
          status: parsed.data.status,
          idempotencyKey: `appointment-updated/${parsed.data.id}/${new Date(parsed.data.startsAt).toISOString()}/${parsed.data.status}`,
        });
      } catch {
        // Appointment updates should still persist if the notification provider fails.
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/reminders");

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
    revalidatePath("/dashboard/reminders");

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
