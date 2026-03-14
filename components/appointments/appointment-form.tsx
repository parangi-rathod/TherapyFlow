"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/app/actions/appointments";
import {
  AppointmentSchema,
  type AppointmentSchemaInput,
} from "@/lib/validations/appointment";

const statusOptions = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show", value: "no_show" },
] as const;

const locationOptions = [
  { label: "In person", value: "in_person" },
  { label: "Virtual", value: "virtual" },
  { label: "Phone", value: "phone" },
] as const;

export type AppointmentFormValues = AppointmentSchemaInput & {
  id?: string;
};

type ClientOption = {
  id: string;
  name: string;
};

type AppointmentFormProps = {
  mode: "create" | "edit";
  clientOptions: ClientOption[];
  initialValues: AppointmentFormValues;
};

export function AppointmentForm({
  mode,
  clientOptions,
  initialValues,
}: AppointmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const browserTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const form = useForm<AppointmentSchemaInput>({
    resolver: zodResolver(AppointmentSchema),
    defaultValues: {
      clientId: initialValues.clientId,
      startsAt: initialValues.startsAt,
      endsAt: initialValues.endsAt,
      timezone: initialValues.timezone || browserTimezone,
      status: initialValues.status,
      locationType: initialValues.locationType,
      locationDetails: initialValues.locationDetails ?? "",
      meetingUrl: initialValues.meetingUrl ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAppointmentAction(values)
          : await updateAppointmentAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the appointment.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Appointment created successfully."
          : "Appointment updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          clientId: clientOptions[0]?.id ?? "",
          startsAt: "",
          endsAt: "",
          timezone: browserTimezone,
          status: "scheduled",
          locationType: "in_person",
          locationDetails: "",
          meetingUrl: "",
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client" id={`${mode}-client`} error={form.formState.errors.clientId?.message}>
          <select
            id={`${mode}-client`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("clientId")}
          >
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timezone" id={`${mode}-timezone`} error={form.formState.errors.timezone?.message}>
          <input
            id={`${mode}-timezone`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("timezone")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Start" id={`${mode}-start`} error={form.formState.errors.startsAt?.message}>
          <input
            id={`${mode}-start`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("startsAt")}
          />
        </Field>
        <Field label="End" id={`${mode}-end`} error={form.formState.errors.endsAt?.message}>
          <input
            id={`${mode}-end`}
            type="datetime-local"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("endsAt")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status" id={`${mode}-status`} error={form.formState.errors.status?.message}>
          <select
            id={`${mode}-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("status")}
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Location type"
          id={`${mode}-location-type`}
          error={form.formState.errors.locationType?.message}
        >
          <select
            id={`${mode}-location-type`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("locationType")}
          >
            {locationOptions.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Location details"
          id={`${mode}-location-details`}
          error={form.formState.errors.locationDetails?.message}
        >
          <input
            id={`${mode}-location-details`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("locationDetails")}
          />
        </Field>
        <Field
          label="Meeting URL"
          id={`${mode}-meeting-url`}
          error={form.formState.errors.meetingUrl?.message}
        >
          <input
            id={`${mode}-meeting-url`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("meetingUrl")}
          />
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
            ? "Saving appointment..."
            : "Updating appointment..."
          : mode === "create"
            ? "Create appointment"
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
