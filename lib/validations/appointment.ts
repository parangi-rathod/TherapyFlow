import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500, "Value is too long.")
  .optional()
  .or(z.literal(""));

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .optional()
  .or(z.literal(""));

const AppointmentFields = {
  clientId: z.string().uuid("Select a valid client."),
  startsAt: z.string().min(1, "Start time is required."),
  endsAt: z.string().min(1, "End time is required."),
  timezone: z
    .string()
    .trim()
    .min(2, "Timezone is required.")
    .max(100, "Timezone is too long."),
  status: z.enum([
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ]),
  locationType: z.enum(["in_person", "virtual", "phone"]),
  locationDetails: optionalText,
  meetingUrl: optionalUrl,
};

const AppointmentBaseSchema = z.object(AppointmentFields);

export const AppointmentSchema = AppointmentBaseSchema
  .refine(
    (value) => {
      const start = new Date(value.startsAt);
      const end = new Date(value.endsAt);
      return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start;
    },
    {
      path: ["endsAt"],
      message: "End time must be after the start time.",
    },
  );

export const UpdateAppointmentSchema = AppointmentBaseSchema.extend({
  id: z.string().uuid("Invalid appointment identifier."),
}).refine(
  (value) => {
    const start = new Date(value.startsAt);
    const end = new Date(value.endsAt);
    return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start;
  },
  {
    path: ["endsAt"],
    message: "End time must be after the start time.",
  },
);

export type AppointmentSchemaInput = z.infer<typeof AppointmentSchema>;
export type UpdateAppointmentSchemaInput = z.infer<typeof UpdateAppointmentSchema>;
