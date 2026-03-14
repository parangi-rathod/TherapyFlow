import { z } from "zod";

export const CreatePracticeSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters.")
    .max(40, "Slug must be 40 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and hyphens only.",
    ),
});

export type CreatePracticeSchemaInput = z.infer<typeof CreatePracticeSchema>;
