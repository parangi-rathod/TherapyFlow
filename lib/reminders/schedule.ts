export const reminderChannelOptions = ["email", "sms"] as const;

export type ReminderChannel = (typeof reminderChannelOptions)[number];

export type ReminderPayload = {
  message?: string;
  offsetMinutes?: number;
  deliveryTarget?: string | null;
  clientName?: string | null;
  error?: string | null;
};

export function buildReminderMessage(input: {
  channel: ReminderChannel;
  clientName: string;
  appointmentLabel: string;
  practiceName: string;
}) {
  const prefix =
    input.channel === "sms" ? "TherapyFlow reminder:" : "Hello";

  if (input.channel === "sms") {
    return `${prefix} ${input.clientName}, you have an appointment with ${input.practiceName} on ${input.appointmentLabel}. Reply to the practice if you need to reschedule.`;
  }

  return `${prefix} ${input.clientName}, this is a reminder from ${input.practiceName} about your appointment on ${input.appointmentLabel}. Please contact the practice if you need to reschedule.`;
}

export function computeReminderSchedule(
  startsAt: string,
  offsetMinutes: number,
) {
  return new Date(new Date(startsAt).getTime() - offsetMinutes * 60 * 1000);
}

export function parseReminderPayload(payload: unknown): ReminderPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const candidate = payload as Record<string, unknown>;

  return {
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
    offsetMinutes:
      typeof candidate.offsetMinutes === "number"
        ? candidate.offsetMinutes
        : undefined,
    deliveryTarget:
      typeof candidate.deliveryTarget === "string"
        ? candidate.deliveryTarget
        : candidate.deliveryTarget === null
          ? null
          : undefined,
    clientName:
      typeof candidate.clientName === "string"
        ? candidate.clientName
        : candidate.clientName === null
          ? null
          : undefined,
    error:
      typeof candidate.error === "string"
        ? candidate.error
        : candidate.error === null
          ? null
          : undefined,
  };
}

export function formatReminderOffset(offsetMinutes: number) {
  if (offsetMinutes % 1440 === 0) {
    const days = offsetMinutes / 1440;
    return `${days} day${days === 1 ? "" : "s"} before`;
  }

  if (offsetMinutes % 60 === 0) {
    const hours = offsetMinutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} before`;
  }

  return `${offsetMinutes} minutes before`;
}
