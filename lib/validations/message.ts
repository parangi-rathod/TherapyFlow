import { z } from "zod";

const optionalSubject = z
  .string()
  .trim()
  .max(160, "Subject must be 160 characters or fewer.")
  .optional()
  .or(z.literal(""));

const messageBody = z
  .string()
  .trim()
  .min(1, "Message body is required.")
  .max(4000, "Message body must be 4000 characters or fewer.");

export const MessageThreadSchema = z.object({
  clientId: z.string().uuid("Select a valid client."),
  subject: optionalSubject,
  initialMessage: messageBody,
});

export const SendMessageSchema = z.object({
  threadId: z.string().uuid("Invalid thread identifier."),
  body: messageBody,
  senderType: z.enum(["therapist", "client"]),
});

export type MessageThreadSchemaInput = z.infer<typeof MessageThreadSchema>;
export type SendMessageSchemaInput = z.infer<typeof SendMessageSchema>;
