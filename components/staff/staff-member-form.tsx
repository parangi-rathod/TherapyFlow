"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  addStaffMemberAction,
  updateStaffMemberAction,
} from "@/app/actions/staff";
import {
  AddStaffMemberSchema,
  UpdateStaffMemberSchema,
  type AddStaffMemberSchemaInput,
  type UpdateStaffMemberSchemaInput,
} from "@/lib/validations/staff";

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Therapist", value: "therapist" },
  { label: "Billing", value: "billing" },
] as const;

const createStatusOptions = [
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
] as const;

const editStatusOptions = [
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
  { label: "Disabled", value: "disabled" },
] as const;

export type StaffMemberFormValues = {
  membershipId?: string;
  email: string;
  role: "admin" | "therapist" | "billing";
  status: "invited" | "active" | "disabled";
};

type StaffMemberFormProps = {
  mode: "create" | "edit";
  initialValues: StaffMemberFormValues;
  disableStatusChange?: boolean;
};

export function StaffMemberForm({
  mode,
  initialValues,
  disableStatusChange = false,
}: StaffMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createForm = useForm<AddStaffMemberSchemaInput>({
    resolver: zodResolver(AddStaffMemberSchema),
    defaultValues: {
      email: initialValues.email,
      role: initialValues.role,
      status:
        initialValues.status === "disabled" ? "invited" : initialValues.status,
    },
  });

  const editForm = useForm<UpdateStaffMemberSchemaInput>({
    resolver: zodResolver(UpdateStaffMemberSchema),
    defaultValues: {
      membershipId: initialValues.membershipId ?? "",
      role: initialValues.role,
      status: initialValues.status,
    },
  });

  const onSubmit =
    mode === "create"
      ? createForm.handleSubmit((values) => {
          setErrorMessage(null);
          setSuccessMessage(null);

          startTransition(async () => {
            const result = await addStaffMemberAction(values);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to add the staff member.");
              return;
            }

            setSuccessMessage("Staff member added successfully.");
            createForm.reset({
              email: "",
              role: "therapist",
              status: "invited",
            });
            router.refresh();
          });
        })
      : editForm.handleSubmit((values) => {
          setErrorMessage(null);
          setSuccessMessage(null);

          startTransition(async () => {
            const result = await updateStaffMemberAction(values);

            if (!result.success) {
              setErrorMessage(result.error ?? "Unable to update the staff member.");
              return;
            }

            setSuccessMessage("Staff member updated successfully.");
            router.refresh();
          });
        });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className={`grid gap-4 ${mode === "create" ? "md:grid-cols-[1.2fr_220px_180px]" : "md:grid-cols-[220px_180px]"}`}>
        {mode === "create" ? (
          <Field
            id="staff-email"
            label="Staff email"
            error={createForm.formState.errors.email?.message}
          >
            <input
              id="staff-email"
              type="email"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="teammate@practice.com"
              {...createForm.register("email")}
            />
          </Field>
        ) : null}

        <Field
          id={`${mode}-staff-role`}
          label="Role"
          error={
            mode === "create"
              ? createForm.formState.errors.role?.message
              : editForm.formState.errors.role?.message
          }
        >
          <select
            id={`${mode}-staff-role`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...(mode === "create"
              ? createForm.register("role")
              : editForm.register("role"))}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id={`${mode}-staff-status`}
          label="Status"
          error={
            mode === "create"
              ? createForm.formState.errors.status?.message
              : editForm.formState.errors.status?.message
          }
        >
          <select
            id={`${mode}-staff-status`}
            disabled={disableStatusChange}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            {...(mode === "create"
              ? createForm.register("status")
              : editForm.register("status"))}
          >
            {(mode === "create" ? createStatusOptions : editStatusOptions).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? mode === "create"
            ? "Adding staff..."
            : "Updating staff..."
          : mode === "create"
            ? "Add staff member"
            : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
