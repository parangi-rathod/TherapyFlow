"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createReminderAction,
  updateReminderAction,
} from "@/app/actions/reminders";
import {
  buildReminderMessage,
  computeReminderSchedule,
  type ReminderChannel,
} from "@/lib/reminders/schedule";
import {
  ReminderSchema,
  type ReminderSchemaInput,
} from "@/lib/validations/reminder";

const channelOptions = [
  { label: "Email", value: "email" },
  { label: "SMS", value: "sms" },
] as const;

export type ReminderFormValues = ReminderSchemaInput & {
  id?: string;
};

export type ReminderAppointmentOption = {
  id: string;
  label: string;
  startsAt: string;
  timezone: string;
  clientName: string;
  email: string | null;
  phone: string | null;
};

type ReminderFormProps = {
  mode: "create" | "edit";
  practiceName: string;
  appointmentOptions: ReminderAppointmentOption[];
  initialValues: ReminderFormValues;
};

function formatSchedulePreview(
  startsAt: string,
  offsetMinutes: number,
  timezone: string,
) {
  const scheduledFor = computeReminderSchedule(startsAt, offsetMinutes);

  if (!Number.isFinite(scheduledFor.getTime())) {
    return "Invalid appointment time";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(scheduledFor);
}

export function ReminderForm({
  mode,
  practiceName,
  appointmentOptions,
  initialValues,
}: ReminderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [messageDirty, setMessageDirty] = useState(mode === "edit");
  const form = useForm<ReminderSchemaInput>({
    resolver: zodResolver(ReminderSchema),
    defaultValues: {
      appointmentId: initialValues.appointmentId,
      channel: initialValues.channel,
      offsetMinutes: initialValues.offsetMinutes,
      message: initialValues.message,
    },
  });
  const selectedAppointmentId = form.watch("appointmentId");
  const selectedChannel = form.watch("channel");
  const selectedOffsetMinutes = form.watch("offsetMinutes");
  const selectedAppointment =
    appointmentOptions.find((appointment) => appointment.id === selectedAppointmentId) ??
    appointmentOptions[0];
  const deliveryTarget =
    selectedChannel === "email"
      ? selectedAppointment?.email ?? null
      : selectedAppointment?.phone ?? null;

  useEffect(() => {
    if (!selectedAppointment || messageDirty) {
      return;
    }

    form.setValue(
      "message",
      buildReminderMessage({
        channel: selectedChannel,
        clientName: selectedAppointment.clientName,
        appointmentLabel: selectedAppointment.label,
        practiceName,
      }),
    );
  }, [
    form,
    messageDirty,
    practiceName,
    selectedAppointment,
    selectedChannel,
  ]);

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createReminderAction(values)
          : await updateReminderAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the reminder.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Reminder scheduled successfully."
          : "Reminder updated successfully.",
      );

      if (mode === "create") {
        const firstAppointment = appointmentOptions[0];
        const channel: ReminderChannel = "email";

        form.reset({
          appointmentId: firstAppointment?.id ?? "",
          channel,
          offsetMinutes: 1440,
          message: firstAppointment
            ? buildReminderMessage({
                channel,
                clientName: firstAppointment.clientName,
                appointmentLabel: firstAppointment.label,
                practiceName,
              })
            : "",
        });
        setMessageDirty(false);
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Appointment"
          id={`${mode}-appointment`}
          error={form.formState.errors.appointmentId?.message}
        >
          <select
            id={`${mode}-appointment`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("appointmentId")}
          >
            {appointmentOptions.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Channel"
          id={`${mode}-channel`}
          error={form.formState.errors.channel?.message}
        >
          <select
            id={`${mode}-channel`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("channel")}
          >
            {channelOptions.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Timing in minutes before appointment"
          id={`${mode}-offset`}
          error={form.formState.errors.offsetMinutes?.message}
        >
          <input
            id={`${mode}-offset`}
            type="number"
            min={5}
            max={10080}
            step={5}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("offsetMinutes", { valueAsNumber: true })}
          />
        </Field>
        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Delivery target</p>
          <p className="mt-2">
            {deliveryTarget
              ? deliveryTarget
              : "The selected client is missing this contact method."}
          </p>
          {selectedAppointment ? (
            <p className="mt-3">
              Scheduled send time:{" "}
              {formatSchedulePreview(
                selectedAppointment.startsAt,
                Number(selectedOffsetMinutes || 0),
                selectedAppointment.timezone,
              )}
            </p>
          ) : null}
        </div>
      </div>

      <Field
        label="Reminder message"
        id={`${mode}-message`}
        error={form.formState.errors.message?.message}
      >
        <textarea
          id={`${mode}-message`}
          rows={5}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("message", {
            onChange: () => {
              setMessageDirty(true);
            },
          })}
        />
      </Field>

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
            ? "Scheduling reminder..."
            : "Updating reminder..."
          : mode === "create"
            ? "Schedule reminder"
            : "Save reminder"}
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
