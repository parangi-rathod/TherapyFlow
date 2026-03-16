import { z } from "zod";

import { reminderChannelOptions } from "@/lib/reminders/schedule";

const ReminderFields = {
  appointmentId: z.string().uuid("Select a valid appointment."),
  channel: z.enum(reminderChannelOptions),
  offsetMinutes: z.coerce
    .number()
    .int("Reminder timing must be a whole number.")
    .min(5, "Reminder timing must be at least 5 minutes.")
    .max(10080, "Reminder timing cannot exceed 7 days."),
  message: z
    .string()
    .trim()
    .min(10, "Reminder message must be at least 10 characters.")
    .max(500, "Reminder message is too long."),
};

export const ReminderSchema = z.object(ReminderFields);

export const UpdateReminderSchema = ReminderSchema.extend({
  id: z.string().uuid("Invalid reminder identifier."),
});

export type ReminderSchemaInput = z.infer<typeof ReminderSchema>;
export type UpdateReminderSchemaInput = z.infer<typeof UpdateReminderSchema>;
