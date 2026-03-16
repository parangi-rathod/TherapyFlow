import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmailViaResend, hasResendEmailConfig } from "@/lib/email/resend";
import { parseReminderPayload } from "@/lib/reminders/schedule";

type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

type ReminderDeliveryRow = {
  id: string;
  practice_id: string;
  appointment_id: string;
  channel: "email" | "sms" | "in_app";
  scheduled_for: string;
  status: ReminderStatus;
  payload: unknown;
};

type AppointmentDeliveryRow = {
  id: string;
  practice_id: string;
  client_id: string;
  starts_at: string;
  timezone: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type ClientDeliveryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

type PracticeDeliveryRow = {
  id: string;
  name: string;
};

export type ReminderProcessingSummary = {
  processed: number;
  sent: number;
  failed: number;
  cancelled: number;
  skipped: number;
};

function buildReminderSubject(practiceName: string) {
  return `Appointment reminder from ${practiceName}`;
}

function buildReminderEmailHtml(input: {
  practiceName: string;
  clientName: string;
  appointmentTime: string;
  message: string;
}) {
  return `
    <div style="background:#f4fbfa;padding:32px;font-family:Inter,Arial,sans-serif;color:#12323c;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d4e7e5;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f766e,#1d4ed8);color:#effcf9;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.86;">TherapyFlow Care Reminder</p>
          <h1 style="margin:0;font-size:28px;line-height:1.1;">Upcoming appointment</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 12px;font-size:16px;">Hello ${input.clientName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${input.message}</p>
          <div style="border:1px solid #d7ece8;border-radius:18px;background:#f7fbff;padding:18px 20px;margin:24px 0;">
            <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#4b6b74;">Appointment time</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">${input.appointmentTime}</p>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#49616c;">
            If you need to reschedule, please contact ${input.practiceName} as soon as possible.
          </p>
        </div>
      </div>
    </div>
  `.trim();
}

function buildAppointmentConfirmationEmail(input: {
  practiceName: string;
  clientName: string;
  appointmentTime: string;
  timezone: string;
  locationType: string;
  locationDetails: string | null;
  meetingUrl: string | null;
  status: string;
}) {
  const locationLine =
    input.locationType === "virtual" && input.meetingUrl
      ? `Join link: ${input.meetingUrl}`
      : input.locationDetails || input.locationType.replace(/_/g, " ");

  return {
    subject:
      input.status === "cancelled"
        ? `Appointment cancelled by ${input.practiceName}`
        : `Appointment update from ${input.practiceName}`,
    html: `
      <div style="background:#f3faf8;padding:32px;font-family:Inter,Arial,sans-serif;color:#12323c;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d6e9e5;border-radius:24px;overflow:hidden;">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#14532d,#0f766e);color:#f0fdf4;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.86;">Care Schedule Update</p>
            <h1 style="margin:0;font-size:28px;line-height:1.1;">${input.status === "cancelled" ? "Appointment cancelled" : "Appointment confirmed"}</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 12px;font-size:16px;">Hello ${input.clientName},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
              ${input.status === "cancelled"
                ? `Your appointment with ${input.practiceName} has been cancelled.`
                : `Your appointment with ${input.practiceName} has been scheduled or updated.`}
            </p>
            <div style="border:1px solid #d7ece8;border-radius:18px;background:#f7fbff;padding:18px 20px;margin:24px 0;">
              <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#4b6b74;">Appointment time</p>
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0f172a;">${input.appointmentTime}</p>
              <p style="margin:0;font-size:14px;color:#49616c;">Timezone: ${input.timezone}</p>
            </div>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#49616c;">
              Location: ${locationLine}
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#49616c;">
              Please contact ${input.practiceName} if you need to reschedule.
            </p>
          </div>
        </div>
      </div>
    `.trim(),
  };
}

function formatAppointmentTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

async function getDeliveryContext(
  supabase: SupabaseClient,
  reminder: ReminderDeliveryRow,
) {
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, practice_id, client_id, starts_at, timezone, status")
    .eq("id", reminder.appointment_id)
    .eq("practice_id", reminder.practice_id)
    .maybeSingle<AppointmentDeliveryRow>();

  if (appointmentError || !appointment) {
    throw new Error("Linked appointment could not be found.");
  }

  const [{ data: client, error: clientError }, { data: practice, error: practiceError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("id", appointment.client_id)
        .eq("practice_id", reminder.practice_id)
        .maybeSingle<ClientDeliveryRow>(),
      supabase
        .from("practices")
        .select("id, name")
        .eq("id", reminder.practice_id)
        .maybeSingle<PracticeDeliveryRow>(),
    ]);

  if (clientError || !client) {
    throw new Error("Linked client could not be found.");
  }

  if (practiceError || !practice) {
    throw new Error("Linked practice could not be found.");
  }

  return { appointment, client, practice };
}

export async function processDueEmailReminders(input: {
  supabase: SupabaseClient;
  practiceId?: string;
  limit?: number;
}) {
  if (!hasResendEmailConfig()) {
    throw new Error(
      "Reminder email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const query = input.supabase
    .from("reminders")
    .select("id, practice_id, appointment_id, channel, scheduled_for, status, payload")
    .eq("channel", "email")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(input.limit ?? 25);

  if (input.practiceId) {
    query.eq("practice_id", input.practiceId);
  }

  const { data: reminders, error } = await query;

  if (error) {
    throw new Error(error.message ?? "Unable to load pending email reminders.");
  }

  const summary: ReminderProcessingSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
  };

  for (const reminder of (reminders ?? []) as ReminderDeliveryRow[]) {
    summary.processed += 1;

    try {
      const payload = parseReminderPayload(reminder.payload);
      const { appointment, client, practice } = await getDeliveryContext(
        input.supabase,
        reminder,
      );

      if (appointment.status === "cancelled") {
        await input.supabase
          .from("reminders")
          .update({ status: "cancelled" satisfies ReminderStatus })
          .eq("id", reminder.id);
        summary.cancelled += 1;
        continue;
      }

      const deliveryTarget = payload.deliveryTarget ?? client.email?.trim() ?? "";

      if (!deliveryTarget) {
        await input.supabase
          .from("reminders")
          .update({
            status: "failed" satisfies ReminderStatus,
            payload: {
              ...payload,
              error: "Missing client email for reminder delivery.",
            },
          })
          .eq("id", reminder.id);
        summary.failed += 1;
        continue;
      }

      const clientName =
        payload.clientName ||
        `${client.first_name} ${client.last_name}`.trim() ||
        "Client";
      const appointmentTime = formatAppointmentTime(
        appointment.starts_at,
        appointment.timezone,
      );

      await sendEmailViaResend({
        to: deliveryTarget,
        subject: buildReminderSubject(practice.name),
        html: buildReminderEmailHtml({
          practiceName: practice.name,
          clientName,
          appointmentTime,
          message:
            payload.message ||
            `This is a reminder about your appointment with ${practice.name} on ${appointmentTime}.`,
        }),
        idempotencyKey: `appointment-reminder/${reminder.id}`,
      });

      await input.supabase
        .from("reminders")
        .update({
          status: "sent" satisfies ReminderStatus,
          sent_at: new Date().toISOString(),
          payload: {
            ...payload,
            deliveryTarget,
          },
        })
        .eq("id", reminder.id);

      summary.sent += 1;
    } catch (deliveryError) {
      await input.supabase
        .from("reminders")
        .update({
          status: "failed" satisfies ReminderStatus,
          payload: {
            ...parseReminderPayload(reminder.payload),
            error:
              deliveryError instanceof Error
                ? deliveryError.message
                : "Reminder delivery failed.",
          },
        })
        .eq("id", reminder.id);
      summary.failed += 1;
    }
  }

  return summary;
}

export async function sendAppointmentNotificationEmail(input: {
  to: string;
  practiceName: string;
  clientName: string;
  startsAt: string;
  timezone: string;
  locationType: string;
  locationDetails: string | null;
  meetingUrl: string | null;
  status: string;
  idempotencyKey: string;
}) {
  if (!hasResendEmailConfig()) {
    return;
  }

  const appointmentTime = formatAppointmentTime(input.startsAt, input.timezone);
  const message = buildAppointmentConfirmationEmail({
    practiceName: input.practiceName,
    clientName: input.clientName,
    appointmentTime,
    timezone: input.timezone,
    locationType: input.locationType,
    locationDetails: input.locationDetails,
    meetingUrl: input.meetingUrl,
    status: input.status,
  });

  await sendEmailViaResend({
    to: input.to,
    subject: message.subject,
    html: message.html,
    idempotencyKey: input.idempotencyKey,
  });
}
