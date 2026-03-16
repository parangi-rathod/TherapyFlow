import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(2000, "Notes must be 2000 characters or fewer.")
  .optional()
  .or(z.literal(""));

const timeEntryFields = {
  clientId: z.string().uuid("Select a valid client."),
  sessionId: z.string().uuid("Select a valid session.").optional().or(z.literal("")),
  startsAt: z.string().min(1, "Start time is required."),
  endsAt: z.string().min(1, "End time is required."),
  isBillable: z.boolean(),
  billingStatus: z.enum(["unbilled", "ready", "billed", "non_billable"]),
  notes: optionalText,
} as const;

function applyTimeEntryRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
    (value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "End time must be after the start time.",
      path: ["endsAt"],
    },
  )
    .refine(
    (value) =>
      value.isBillable
        ? value.billingStatus !== "non_billable"
        : value.billingStatus === "non_billable",
    {
      message: "Billing status must match the billable setting.",
      path: ["billingStatus"],
    },
  );
}

export const TimeEntrySchema = applyTimeEntryRefinements(z.object(timeEntryFields));

export const UpdateTimeEntrySchema = applyTimeEntryRefinements(
  z.object({
    ...timeEntryFields,
    id: z.string().uuid("Invalid time entry identifier."),
  }),
);

export type TimeEntrySchemaInput = z.infer<typeof TimeEntrySchema>;
export type UpdateTimeEntrySchemaInput = z.infer<typeof UpdateTimeEntrySchema>;
