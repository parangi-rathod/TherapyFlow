import { z } from "zod";

const documentTypeValues = [
  "consent_form",
  "intake_form",
  "assessment",
  "report",
  "other",
] as const;

export const DocumentSchema = z.object({
  clientId: z.string().uuid("Select a valid client."),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  documentType: z.enum(documentTypeValues),
  isClientVisible: z.boolean(),
  storageBucket: z.string().trim().min(1, "Storage bucket is required."),
  storagePath: z.string().trim().min(1, "Storage path is required."),
  mimeType: z.string().trim().optional().or(z.literal("")),
  fileSizeBytes: z.number().int().nonnegative().optional(),
});

export const UpdateDocumentSchema = z.object({
  id: z.string().uuid("Invalid document identifier."),
  clientId: z.string().uuid("Select a valid client."),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  documentType: z.enum(documentTypeValues),
  isClientVisible: z.boolean(),
});

export type DocumentSchemaInput = z.infer<typeof DocumentSchema>;
export type UpdateDocumentSchemaInput = z.infer<typeof UpdateDocumentSchema>;
