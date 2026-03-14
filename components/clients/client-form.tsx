"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createClientAction,
  updateClientAction,
} from "@/app/actions/clients";
import {
  ClientSchema,
  type ClientSchemaInput,
} from "@/lib/validations/client";

const statusOptions = [
  { label: "Lead", value: "lead" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Discharged", value: "discharged" },
] as const;

export type ClientFormValues = ClientSchemaInput & {
  id?: string;
};

type ClientFormProps = {
  mode: "create" | "edit";
  initialValues: ClientFormValues;
};

export function ClientForm({ mode, initialValues }: ClientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<ClientSchemaInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: {
      firstName: initialValues.firstName,
      lastName: initialValues.lastName,
      dateOfBirth: initialValues.dateOfBirth ?? "",
      email: initialValues.email ?? "",
      phone: initialValues.phone ?? "",
      emergencyContactName: initialValues.emergencyContactName ?? "",
      emergencyContactPhone: initialValues.emergencyContactPhone ?? "",
      emergencyContactRelationship:
        initialValues.emergencyContactRelationship ?? "",
      therapyHistory: initialValues.therapyHistory ?? "",
      status: initialValues.status,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClientAction(values)
          : await updateClientAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the client.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Client created successfully."
          : "Client updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          email: "",
          phone: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
          emergencyContactRelationship: "",
          therapyHistory: "",
          status: "active",
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" id={`${mode}-first-name`} error={form.formState.errors.firstName?.message}>
          <input
            id={`${mode}-first-name`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("firstName")}
          />
        </Field>
        <Field label="Last name" id={`${mode}-last-name`} error={form.formState.errors.lastName?.message}>
          <input
            id={`${mode}-last-name`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("lastName")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Date of birth" id={`${mode}-dob`} error={form.formState.errors.dateOfBirth?.message}>
          <input
            id={`${mode}-dob`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("dateOfBirth")}
          />
        </Field>
        <Field label="Email" id={`${mode}-email`} error={form.formState.errors.email?.message}>
          <input
            id={`${mode}-email`}
            type="email"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("email")}
          />
        </Field>
        <Field label="Phone" id={`${mode}-phone`} error={form.formState.errors.phone?.message}>
          <input
            id={`${mode}-phone`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("phone")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Emergency contact"
          id={`${mode}-contact-name`}
          error={form.formState.errors.emergencyContactName?.message}
        >
          <input
            id={`${mode}-contact-name`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("emergencyContactName")}
          />
        </Field>
        <Field
          label="Contact phone"
          id={`${mode}-contact-phone`}
          error={form.formState.errors.emergencyContactPhone?.message}
        >
          <input
            id={`${mode}-contact-phone`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("emergencyContactPhone")}
          />
        </Field>
        <Field
          label="Relationship"
          id={`${mode}-relationship`}
          error={form.formState.errors.emergencyContactRelationship?.message}
        >
          <input
            id={`${mode}-relationship`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("emergencyContactRelationship")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Field label="Therapy history" id={`${mode}-history`} error={form.formState.errors.therapyHistory?.message}>
          <textarea
            id={`${mode}-history`}
            rows={4}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("therapyHistory")}
          />
        </Field>
        <Field label="Status" id={`${mode}-status`} error={form.formState.errors.status?.message}>
          <select
            id={`${mode}-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("status")}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            ? "Saving client..."
            : "Updating client..."
          : mode === "create"
            ? "Create client"
            : "Save changes"}
      </button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ id, label, error, children }: FieldProps) {
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
