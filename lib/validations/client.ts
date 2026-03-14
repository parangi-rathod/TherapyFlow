import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500, "Value is too long.")
  .optional()
  .or(z.literal(""));

export const ClientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  dateOfBirth: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  emergencyContactRelationship: optionalText,
  therapyHistory: z
    .string()
    .trim()
    .max(4000, "Therapy history must be 4000 characters or fewer.")
    .optional()
    .or(z.literal("")),
  status: z.enum(["lead", "active", "inactive", "discharged"]),
});

export const UpdateClientSchema = ClientSchema.extend({
  id: z.string().uuid("Invalid client identifier."),
});

export type ClientSchemaInput = z.infer<typeof ClientSchema>;
export type UpdateClientSchemaInput = z.infer<typeof UpdateClientSchema>;
