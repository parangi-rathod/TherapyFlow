import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(4000, "Value is too long.")
  .optional()
  .or(z.literal(""));

const optionalDate = z.string().optional().or(z.literal(""));

export const TreatmentGoalSchema = z.object({
  goalId: z.string().uuid("Invalid treatment goal identifier.").optional().or(z.literal("")),
  title: z.string().trim().min(1, "Goal title is required.").max(200, "Goal title is too long."),
  description: optionalText,
  interventions: optionalText,
  targetDate: optionalDate,
  status: z.enum(["planned", "in_progress", "achieved", "paused"]),
  progressPercent: z
    .number({
      invalid_type_error: "Progress must be a number.",
    })
    .int("Progress must be a whole number.")
    .min(0, "Progress must be at least 0%.")
    .max(100, "Progress must be 100% or less."),
});

const TreatmentPlanFields = {
  clientId: z.string().uuid("Select a valid client."),
  title: z.string().trim().min(1, "Plan title is required.").max(200, "Plan title is too long."),
  summary: optionalText,
  status: z.enum(["draft", "active", "completed", "archived"]),
  startDate: z.string().min(1, "Start date is required."),
  targetReviewDate: optionalDate,
  goals: z
    .array(TreatmentGoalSchema)
    .min(1, "Add at least one treatment goal.")
    .max(12, "Keep treatment plans to 12 goals or fewer."),
};

const TreatmentPlanBaseSchema = z.object(TreatmentPlanFields);
const UpdateTreatmentPlanBaseSchema = TreatmentPlanBaseSchema.extend({
  id: z.string().uuid("Invalid treatment plan identifier."),
});

function isValidDateString(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

export const TreatmentPlanSchema = TreatmentPlanBaseSchema.refine(
  (value) => isValidDateString(value.startDate),
  {
    path: ["startDate"],
    message: "Enter a valid start date.",
  },
).refine(
  (value) =>
    !value.targetReviewDate || isValidDateString(value.targetReviewDate),
  {
    path: ["targetReviewDate"],
    message: "Enter a valid review date.",
  },
).refine(
  (value) =>
    !value.targetReviewDate ||
    new Date(value.targetReviewDate).getTime() >=
      new Date(value.startDate).getTime(),
  {
    path: ["targetReviewDate"],
    message: "Review date must be on or after the start date.",
  },
);

export const UpdateTreatmentPlanSchema = UpdateTreatmentPlanBaseSchema.refine(
  (value) => isValidDateString(value.startDate),
  {
    path: ["startDate"],
    message: "Enter a valid start date.",
  },
).refine(
  (value) =>
    !value.targetReviewDate || isValidDateString(value.targetReviewDate),
  {
    path: ["targetReviewDate"],
    message: "Enter a valid review date.",
  },
).refine(
  (value) =>
    !value.targetReviewDate ||
    new Date(value.targetReviewDate).getTime() >=
      new Date(value.startDate).getTime(),
  {
    path: ["targetReviewDate"],
    message: "Review date must be on or after the start date.",
  },
);

export const TreatmentProgressEntrySchema = z.object({
  treatmentPlanId: z.string().uuid("Invalid treatment plan identifier."),
  goalId: z.string().uuid("Select a valid treatment goal."),
  summary: z
    .string()
    .trim()
    .min(1, "Progress summary is required.")
    .max(4000, "Progress summary is too long."),
  barriers: optionalText,
  nextSteps: optionalText,
  goalStatus: z.enum(["planned", "in_progress", "achieved", "paused"]),
  progressPercent: z
    .number({
      invalid_type_error: "Progress must be a number.",
    })
    .int("Progress must be a whole number.")
    .min(0, "Progress must be at least 0%.")
    .max(100, "Progress must be 100% or less."),
});

export type TreatmentGoalSchemaInput = z.infer<typeof TreatmentGoalSchema>;
export type TreatmentPlanSchemaInput = z.infer<typeof TreatmentPlanSchema>;
export type UpdateTreatmentPlanSchemaInput = z.infer<
  typeof UpdateTreatmentPlanSchema
>;
export type TreatmentProgressEntrySchemaInput = z.infer<
  typeof TreatmentProgressEntrySchema
>;
