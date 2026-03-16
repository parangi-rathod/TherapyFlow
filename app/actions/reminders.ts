"use server";

import { revalidatePath } from "next/cache";

import {
  computeReminderSchedule,
  parseReminderPayload,
  type ReminderChannel,
} from "@/lib/reminders/schedule";
import { processDueEmailReminders } from "@/lib/reminders/delivery";
import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ReminderSchema,
  UpdateReminderSchema,
  type ReminderSchemaInput,
  type UpdateReminderSchemaInput,
} from "@/lib/validations/reminder";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

type AppointmentRow = {
  id: string;
  practice_id: string;
  client_id: string;
  starts_at: string;
  timezone: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
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
    throw new Error("Create a workspace before managing reminders.");
  }

  return { practice };
}

async function getAppointmentAndClient(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  appointmentId: string,
  practiceId: string,
) {
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, practice_id, client_id, starts_at, timezone, status")
    .eq("id", appointmentId)
    .eq("practice_id", practiceId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error("Select a valid appointment.");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone")
    .eq("id", (appointment as AppointmentRow).client_id)
    .eq("practice_id", practiceId)
    .single();

  if (clientError || !client) {
    throw new Error("The appointment client could not be resolved.");
  }

  return {
    appointment: appointment as AppointmentRow,
    client: client as ClientRow,
  };
}

function getDeliveryTarget(client: ClientRow, channel: ReminderChannel) {
  return channel === "email" ? client.email?.trim() ?? "" : client.phone?.trim() ?? "";
}

function buildReminderPayload(input: {
  message: string;
  offsetMinutes: number;
  deliveryTarget: string;
  client: ClientRow;
}) {
  return {
    message: input.message,
    offsetMinutes: input.offsetMinutes,
    deliveryTarget: input.deliveryTarget,
    clientName: `${input.client.first_name} ${input.client.last_name}`.trim(),
  };
}

function revalidateReminderPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/reminders");
}

function validateReminderWindow(startsAt: string, offsetMinutes: number) {
  const scheduledFor = computeReminderSchedule(startsAt, offsetMinutes);

  if (!Number.isFinite(scheduledFor.getTime())) {
    throw new Error("The appointment time is invalid.");
  }

  if (scheduledFor <= new Date()) {
    throw new Error(
      "Reminder timing must schedule the reminder in the future.",
    );
  }

  return scheduledFor;
}

export async function syncAppointmentReminders(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  appointmentId: string,
  practiceId: string,
) {
  const { appointment, client } = await getAppointmentAndClient(
    supabase,
    appointmentId,
    practiceId,
  );

  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("id, channel, status, payload")
    .eq("appointment_id", appointmentId)
    .in("status", ["pending", "failed"]);

  if (remindersError || !reminders?.length) {
    return;
  }

  if (appointment.status === "cancelled") {
    await supabase
      .from("reminders")
      .update({ status: "cancelled" satisfies ReminderStatus })
      .eq("appointment_id", appointmentId)
      .in("status", ["pending", "failed"]);

    return;
  }

  for (const reminder of reminders) {
    const payload = parseReminderPayload(reminder.payload);
    const channel = reminder.channel as ReminderChannel;
    const offsetMinutes = payload.offsetMinutes ?? 1440;
    const deliveryTarget = getDeliveryTarget(client, channel);

    if (!deliveryTarget) {
      await supabase
        .from("reminders")
        .update({
          status: "failed" satisfies ReminderStatus,
          payload: {
            ...payload,
            deliveryTarget: null,
            error: `Missing ${
              channel === "email" ? "email address" : "phone number"
            } for reminder delivery.`,
          },
        })
        .eq("id", reminder.id);
      continue;
    }

    const scheduledFor = computeReminderSchedule(
      appointment.starts_at,
      offsetMinutes,
    );
    const status: ReminderStatus =
      scheduledFor > new Date() ? "pending" : "failed";

    await supabase
      .from("reminders")
      .update({
        scheduled_for: scheduledFor.toISOString(),
        status,
        payload: {
          ...payload,
          deliveryTarget,
          clientName: `${client.first_name} ${client.last_name}`.trim(),
        },
      })
      .eq("id", reminder.id);
  }
}

export async function createReminderAction(
  input: ReminderSchemaInput,
): Promise<ActionResult> {
  const parsed = ReminderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reminder details.",
    };
  }

  try {
    const { practice } = await getUserAndPractice();
    const supabase = await createServerSupabaseClient();
    const { appointment, client } = await getAppointmentAndClient(
      supabase,
      parsed.data.appointmentId,
      practice.id,
    );
    const deliveryTarget = getDeliveryTarget(client, parsed.data.channel);

    if (!deliveryTarget) {
      return {
        success: false,
        error:
          parsed.data.channel === "email"
            ? "The selected client does not have an email address."
            : "The selected client does not have a phone number.",
      };
    }

    if (appointment.status === "cancelled") {
      return {
        success: false,
        error: "Cancelled appointments cannot receive reminders.",
      };
    }

    const scheduledFor = validateReminderWindow(
      appointment.starts_at,
      parsed.data.offsetMinutes,
    );

    const { error } = await supabase.from("reminders").insert({
      practice_id: practice.id,
      appointment_id: parsed.data.appointmentId,
      channel: parsed.data.channel,
      scheduled_for: scheduledFor.toISOString(),
      status: "pending" satisfies ReminderStatus,
      payload: buildReminderPayload({
        message: parsed.data.message,
        offsetMinutes: parsed.data.offsetMinutes,
        deliveryTarget,
        client,
      }),
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to schedule the reminder.",
      };
    }

    revalidateReminderPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to schedule the reminder.",
    };
  }
}

export async function updateReminderAction(
  input: UpdateReminderSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateReminderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reminder details.",
    };
  }

  try {
    const { practice } = await getUserAndPractice();
    const supabase = await createServerSupabaseClient();
    const { appointment, client } = await getAppointmentAndClient(
      supabase,
      parsed.data.appointmentId,
      practice.id,
    );
    const deliveryTarget = getDeliveryTarget(client, parsed.data.channel);

    if (!deliveryTarget) {
      return {
        success: false,
        error:
          parsed.data.channel === "email"
            ? "The selected client does not have an email address."
            : "The selected client does not have a phone number.",
      };
    }

    if (appointment.status === "cancelled") {
      return {
        success: false,
        error: "Cancelled appointments cannot receive reminders.",
      };
    }

    const scheduledFor = validateReminderWindow(
      appointment.starts_at,
      parsed.data.offsetMinutes,
    );

    const { error } = await supabase
      .from("reminders")
      .update({
        appointment_id: parsed.data.appointmentId,
        channel: parsed.data.channel,
        scheduled_for: scheduledFor.toISOString(),
        sent_at: null,
        status: "pending" satisfies ReminderStatus,
        payload: buildReminderPayload({
          message: parsed.data.message,
          offsetMinutes: parsed.data.offsetMinutes,
          deliveryTarget,
          client,
        }),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the reminder.",
      };
    }

    revalidateReminderPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the reminder.",
    };
  }
}

export async function cancelReminderAction(id: string): Promise<ActionResult> {
  if (!id) {
    return {
      success: false,
      error: "Reminder identifier is required.",
    };
  }

  try {
    const { practice } = await getUserAndPractice();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("reminders")
      .update({ status: "cancelled" satisfies ReminderStatus })
      .eq("id", id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to cancel the reminder.",
      };
    }

    revalidateReminderPaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to cancel the reminder.",
    };
  }
}

export async function processEmailRemindersAction(): Promise<
  ActionResult & {
    processed?: number;
    sent?: number;
    failed?: number;
    cancelled?: number;
  }
> {
  try {
    const { practice } = await getUserAndPractice();
    const supabase = await createServerSupabaseClient();
    const summary = await processDueEmailReminders({
      supabase,
      practiceId: practice.id,
    });

    revalidateReminderPaths();

    return {
      success: true,
      processed: summary.processed,
      sent: summary.sent,
      failed: summary.failed,
      cancelled: summary.cancelled,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to process email reminders.",
    };
  }
}
