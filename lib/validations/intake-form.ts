import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(4000, "Value is too long.")
  .optional()
  .or(z.literal(""));

const optionalDate = z.string().optional().or(z.literal(""));

export const IntakeFieldSchema = z.object({
  fieldId: z.string().uuid("Invalid field identifier.").optional().or(z.literal("")),
  label: z.string().trim().min(1, "Field label is required.").max(120, "Field label is too long."),
  fieldType: z.enum([
    "short_text",
    "long_text",
    "email",
    "phone",
    "date",
    "number",
    "yes_no",
    "single_select",
    "multi_select",
  ]),
  placeholder: optionalText,
  helpText: optionalText,
  optionValues: optionalText,
  isRequired: z.boolean(),
});

const IntakeFormFields = {
  title: z.string().trim().min(1, "Form title is required.").max(200, "Form title is too long."),
  description: optionalText,
  status: z.enum(["draft", "published", "archived"]),
  welcomeText: optionalText,
  completionMessage: optionalText,
  fields: z
    .array(IntakeFieldSchema)
    .min(1, "Add at least one intake field.")
    .max(20, "Keep intake forms to 20 fields or fewer."),
};

export const IntakeFormSchema = z.object(IntakeFormFields).superRefine((value, ctx) => {
  value.fields.forEach((field, index) => {
    if (
      (field.fieldType === "single_select" || field.fieldType === "multi_select") &&
      (field.optionValues ?? "").trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields", index, "optionValues"],
        message: "Add at least one option for select fields.",
      });
    }
  });
});

export const UpdateIntakeFormSchema = z
  .object({
    id: z.string().uuid("Invalid intake form identifier."),
  })
  .merge(z.object(IntakeFormFields))
  .superRefine((value, ctx) => {
    value.fields.forEach((field, index) => {
      if (
        (field.fieldType === "single_select" || field.fieldType === "multi_select") &&
        (field.optionValues ?? "").trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "optionValues"],
          message: "Add at least one option for select fields.",
        });
      }
    });
  });

export const IntakeRequestSchema = z.object({
  intakeFormId: z.string().uuid("Select a valid intake form."),
  clientId: z.string().uuid("Select a valid client."),
  expiresAt: optionalDate.refine((value) => !value || Number.isFinite(new Date(value).getTime()), {
    message: "Enter a valid expiration date.",
  }),
});

export const IntakeSubmissionReviewSchema = z.object({
  submissionId: z.string().uuid("Invalid intake submission identifier."),
  reviewNotes: optionalText,
});

const PublicValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
]);

export const PublicIntakeSubmissionSchema = z.object({
  submitterName: optionalText,
  submitterEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  responses: z.record(z.string(), PublicValueSchema),
});

export type IntakeFieldSchemaInput = z.infer<typeof IntakeFieldSchema>;
export type IntakeFormSchemaInput = z.infer<typeof IntakeFormSchema>;
export type UpdateIntakeFormSchemaInput = z.infer<typeof UpdateIntakeFormSchema>;
export type IntakeRequestSchemaInput = z.infer<typeof IntakeRequestSchema>;
export type IntakeSubmissionReviewSchemaInput = z.infer<
  typeof IntakeSubmissionReviewSchema
>;
export type PublicIntakeSubmissionSchemaInput = z.infer<
  typeof PublicIntakeSubmissionSchema
>;
