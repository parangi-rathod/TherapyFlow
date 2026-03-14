import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const SignupSchema = LoginSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  confirmPassword: z.string().min(8, "Confirm your password."),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export type LoginSchemaInput = z.infer<typeof LoginSchema>;
export type SignupSchemaInput = z.infer<typeof SignupSchema>;

