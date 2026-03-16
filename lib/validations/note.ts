import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(10000, "Value is too long.")
  .optional()
  .or(z.literal(""));

const NoteFields = {
  appointmentId: z.string().uuid("Select a valid appointment."),
  startsAt: z.string().min(1, "Session start time is required."),
  endsAt: z.string().min(1, "Session end time is required."),
  sessionStatus: z.enum(["draft", "completed", "cancelled"]),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  plainText: z
    .string()
    .trim()
    .min(1, "Session note content is required.")
    .max(10000, "Session note is too long."),
  tags: optionalText,
  aiSummary: optionalText,
  noteStatus: z.enum(["draft", "final"]),
};

const NoteBaseSchema = z.object(NoteFields);

function hasValidTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  return (
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start
  );
}

export const NoteSchema = NoteBaseSchema.refine(
  (value) => hasValidTimeRange(value.startsAt, value.endsAt),
  {
    path: ["endsAt"],
    message: "Session end time must be after the start time.",
  },
);

export const UpdateNoteSchema = NoteBaseSchema.extend({
  id: z.string().uuid("Invalid note identifier."),
  sessionId: z.string().uuid("Invalid session identifier."),
}).refine((value) => hasValidTimeRange(value.startsAt, value.endsAt), {
  path: ["endsAt"],
  message: "Session end time must be after the start time.",
});

export type NoteSchemaInput = z.infer<typeof NoteSchema>;
export type UpdateNoteSchemaInput = z.infer<typeof UpdateNoteSchema>;
