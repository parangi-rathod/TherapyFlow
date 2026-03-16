import { z } from "zod";

export const AddStaffMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid staff email address."),
  role: z.enum(["admin", "therapist", "billing"]),
  status: z.enum(["invited", "active"]),
});

export const UpdateStaffMemberSchema = z.object({
  membershipId: z.string().uuid("Invalid membership identifier."),
  role: z.enum(["admin", "therapist", "billing"]),
  status: z.enum(["invited", "active", "disabled"]),
});

export const RemoveStaffMemberSchema = z.object({
  membershipId: z.string().uuid("Invalid membership identifier."),
});

export type AddStaffMemberSchemaInput = z.infer<typeof AddStaffMemberSchema>;
export type UpdateStaffMemberSchemaInput = z.infer<typeof UpdateStaffMemberSchema>;
export type RemoveStaffMemberSchemaInput = z.infer<typeof RemoveStaffMemberSchema>;
