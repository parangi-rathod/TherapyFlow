import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(4000, "Value is too long.")
  .optional()
  .or(z.literal(""));

const optionalDate = z.string().optional().or(z.literal(""));

const normalizedCurrency = z
  .string()
  .trim()
  .min(3, "Currency is required.")
  .max(10, "Currency is too long.")
  .transform((value) => value.toUpperCase());

const InvoiceFields = {
  clientId: z.string().uuid("Select a valid client."),
  appointmentId: z.string().uuid("Select a valid appointment.").optional().or(z.literal("")),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required.")
    .max(50, "Invoice number is too long."),
  currency: normalizedCurrency,
  subtotalCents: z
    .number({ invalid_type_error: "Subtotal must be a number." })
    .int("Subtotal must be a whole number.")
    .min(0, "Subtotal must be zero or greater."),
  taxCents: z
    .number({ invalid_type_error: "Tax must be a number." })
    .int("Tax must be a whole number.")
    .min(0, "Tax must be zero or greater."),
  status: z.enum(["draft", "sent", "partial", "paid", "void"]),
  issuedAt: optionalDate,
  dueAt: optionalDate,
  notes: optionalText,
};

const InvoiceBaseSchema = z.object(InvoiceFields);

function isValidDateString(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

export const InvoiceSchema = InvoiceBaseSchema.refine(
  (value) => !value.issuedAt || isValidDateString(value.issuedAt),
  {
    path: ["issuedAt"],
    message: "Enter a valid issue date.",
  },
).refine((value) => !value.dueAt || isValidDateString(value.dueAt), {
  path: ["dueAt"],
  message: "Enter a valid due date.",
}).refine(
  (value) =>
    !value.issuedAt ||
    !value.dueAt ||
    new Date(value.dueAt).getTime() >= new Date(value.issuedAt).getTime(),
  {
    path: ["dueAt"],
    message: "Due date must be on or after the issue date.",
  },
);

export const UpdateInvoiceSchema = z
  .object({
    id: z.string().uuid("Invalid invoice identifier."),
  })
  .merge(InvoiceBaseSchema)
  .refine((value) => !value.issuedAt || isValidDateString(value.issuedAt), {
    path: ["issuedAt"],
    message: "Enter a valid issue date.",
  })
  .refine((value) => !value.dueAt || isValidDateString(value.dueAt), {
    path: ["dueAt"],
    message: "Enter a valid due date.",
  })
  .refine(
    (value) =>
      !value.issuedAt ||
      !value.dueAt ||
      new Date(value.dueAt).getTime() >= new Date(value.issuedAt).getTime(),
    {
      path: ["dueAt"],
      message: "Due date must be on or after the issue date.",
    },
  );

export const PaymentSchema = z.object({
  invoiceId: z.string().uuid("Select a valid invoice."),
  amountCents: z
    .number({ invalid_type_error: "Payment amount must be a number." })
    .int("Payment amount must be a whole number.")
    .min(1, "Payment amount must be greater than zero."),
  currency: normalizedCurrency,
  paymentMethod: z.enum(["cash", "card", "ach", "manual", "other"]),
  externalReference: optionalText,
  paidAt: z.string().min(1, "Payment date is required.").refine(isValidDateString, {
    message: "Enter a valid payment date.",
  }),
});

export type InvoiceSchemaInput = z.infer<typeof InvoiceSchema>;
export type UpdateInvoiceSchemaInput = z.infer<typeof UpdateInvoiceSchema>;
export type PaymentSchemaInput = z.infer<typeof PaymentSchema>;
