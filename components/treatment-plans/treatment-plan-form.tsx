"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
  createTreatmentPlanAction,
  updateTreatmentPlanAction,
} from "@/app/actions/treatment-plans";
import {
  TreatmentPlanSchema,
  type TreatmentPlanSchemaInput,
} from "@/lib/validations/treatment-plan";

const planStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
] as const;

const goalStatusOptions = [
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Achieved", value: "achieved" },
  { label: "Paused", value: "paused" },
] as const;

export type TreatmentPlanFormValues = TreatmentPlanSchemaInput & {
  id?: string;
};

type ClientOption = {
  id: string;
  name: string;
};

type TreatmentPlanFormProps = {
  mode: "create" | "edit";
  clientOptions: ClientOption[];
  initialValues: TreatmentPlanFormValues;
};

const blankGoal = {
  goalId: "",
  title: "",
  description: "",
  interventions: "",
  targetDate: "",
  status: "planned" as const,
  progressPercent: 0,
};

export function TreatmentPlanForm({
  mode,
  clientOptions,
  initialValues,
}: TreatmentPlanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<TreatmentPlanSchemaInput>({
    resolver: zodResolver(TreatmentPlanSchema),
    defaultValues: initialValues,
  });
  const goalFields = useFieldArray({
    control: form.control,
    name: "goals",
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTreatmentPlanAction(values)
          : await updateTreatmentPlanAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the treatment plan.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Treatment plan created successfully."
          : "Treatment plan updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          clientId: clientOptions[0]?.id ?? "",
          title: "",
          summary: "",
          status: "draft",
          startDate: "",
          targetReviewDate: "",
          goals: [{ ...blankGoal }],
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-client`}
          label="Client"
          error={form.formState.errors.clientId?.message}
        >
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
        <Field
          id={`${mode}-status`}
          label="Plan status"
          error={form.formState.errors.status?.message}
        >
          <select
            id={`${mode}-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("status")}
          >
            {planStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-title`}
          label="Plan title"
          error={form.formState.errors.title?.message}
        >
          <input
            id={`${mode}-title`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("title")}
          />
        </Field>
        <Field
          id={`${mode}-start-date`}
          label="Start date"
          error={form.formState.errors.startDate?.message}
        >
          <input
            id={`${mode}-start-date`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("startDate")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-review-date`}
          label="Next review date"
          error={form.formState.errors.targetReviewDate?.message}
        >
          <input
            id={`${mode}-review-date`}
            type="date"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("targetReviewDate")}
          />
        </Field>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/80 px-4 py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Plan guidance</p>
          <p className="mt-2">
            Keep goals concrete, write interventions as one item per line, and
            update day-to-day progress with the progress form below each plan.
          </p>
        </div>
      </div>

      <Field
        id={`${mode}-summary`}
        label="Clinical summary"
        error={form.formState.errors.summary?.message}
      >
        <textarea
          id={`${mode}-summary`}
          rows={4}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("summary")}
        />
      </Field>

      <section className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Goals
            </p>
            <h3 className="mt-2 text-xl font-semibold">Plan goals and interventions</h3>
          </div>
          <button
            type="button"
            onClick={() => goalFields.append({ ...blankGoal })}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Add goal
          </button>
        </div>

        <div className="space-y-4">
          {goalFields.fields.map((field, index) => {
            const goalId = form.watch(`goals.${index}.goalId`);
            const allowRemove = mode === "create" || !goalId;

            return (
              <article
                key={field.id}
                className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5"
              >
                <input type="hidden" {...form.register(`goals.${index}.goalId`)} />
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h4 className="text-lg font-semibold">Goal {index + 1}</h4>
                  {allowRemove ? (
                    <button
                      type="button"
                      onClick={() => goalFields.remove(index)}
                      disabled={goalFields.fields.length === 1}
                      className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove goal
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Existing goal kept for progress history
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-goal-title-${index}`}
                    label="Goal title"
                    error={form.formState.errors.goals?.[index]?.title?.message}
                  >
                    <input
                      id={`${mode}-goal-title-${index}`}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.title`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-goal-status-${index}`}
                    label="Goal status"
                    error={form.formState.errors.goals?.[index]?.status?.message}
                  >
                    <select
                      id={`${mode}-goal-status-${index}`}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.status`)}
                    >
                      {goalStatusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-goal-target-${index}`}
                    label="Target date"
                    error={form.formState.errors.goals?.[index]?.targetDate?.message}
                  >
                    <input
                      id={`${mode}-goal-target-${index}`}
                      type="date"
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.targetDate`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-goal-progress-${index}`}
                    label="Progress percent"
                    error={form.formState.errors.goals?.[index]?.progressPercent?.message}
                  >
                    <input
                      id={`${mode}-goal-progress-${index}`}
                      type="number"
                      min={0}
                      max={100}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.progressPercent`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-goal-description-${index}`}
                    label="Desired outcome"
                    error={form.formState.errors.goals?.[index]?.description?.message}
                  >
                    <textarea
                      id={`${mode}-goal-description-${index}`}
                      rows={4}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.description`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-goal-interventions-${index}`}
                    label="Interventions"
                    error={form.formState.errors.goals?.[index]?.interventions?.message}
                  >
                    <textarea
                      id={`${mode}-goal-interventions-${index}`}
                      rows={4}
                      placeholder={"Weekly CBT homework\nBreathing practice"}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`goals.${index}.interventions`)}
                    />
                  </Field>
                </div>
              </article>
            );
          })}
        </div>
      </section>

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
            ? "Saving plan..."
            : "Updating plan..."
          : mode === "create"
            ? "Create treatment plan"
            : "Save treatment plan"}
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
