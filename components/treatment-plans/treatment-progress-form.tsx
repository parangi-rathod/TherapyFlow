"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { recordTreatmentPlanProgressAction } from "@/app/actions/treatment-plans";
import {
  TreatmentProgressEntrySchema,
  type TreatmentProgressEntrySchemaInput,
} from "@/lib/validations/treatment-plan";

const goalStatusOptions = [
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Achieved", value: "achieved" },
  { label: "Paused", value: "paused" },
] as const;

type GoalOption = {
  id: string;
  title: string;
  status: "planned" | "in_progress" | "achieved" | "paused";
  progressPercent: number;
};

type TreatmentProgressFormProps = {
  treatmentPlanId: string;
  goalOptions: GoalOption[];
};

export function TreatmentProgressForm({
  treatmentPlanId,
  goalOptions,
}: TreatmentProgressFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<TreatmentProgressEntrySchemaInput>({
    resolver: zodResolver(TreatmentProgressEntrySchema),
    defaultValues: {
      treatmentPlanId,
      goalId: goalOptions[0]?.id ?? "",
      summary: "",
      barriers: "",
      nextSteps: "",
      goalStatus: goalOptions[0]?.status ?? "planned",
      progressPercent: goalOptions[0]?.progressPercent ?? 0,
    },
  });

  const selectedGoalId = form.watch("goalId");
  const selectedGoal = goalOptions.find((goal) => goal.id === selectedGoalId);

  useEffect(() => {
    if (!selectedGoal) {
      return;
    }

    form.setValue("goalStatus", selectedGoal.status);
    form.setValue("progressPercent", selectedGoal.progressPercent);
  }, [form, selectedGoal]);

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await recordTreatmentPlanProgressAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to record progress.");
        return;
      }

      setSuccessMessage("Progress update recorded successfully.");
      form.reset({
        treatmentPlanId,
        goalId: values.goalId,
        summary: "",
        barriers: "",
        nextSteps: "",
        goalStatus: values.goalStatus,
        progressPercent: values.progressPercent,
      });
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          id={`progress-goal-${treatmentPlanId}`}
          label="Goal"
          error={form.formState.errors.goalId?.message}
        >
          <select
            id={`progress-goal-${treatmentPlanId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("goalId")}
          >
            {goalOptions.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`progress-status-${treatmentPlanId}`}
          label="Goal status"
          error={form.formState.errors.goalStatus?.message}
        >
          <select
            id={`progress-status-${treatmentPlanId}`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("goalStatus")}
          >
            {goalStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`progress-percent-${treatmentPlanId}`}
          label="Progress percent"
          error={form.formState.errors.progressPercent?.message}
        >
          <input
            id={`progress-percent-${treatmentPlanId}`}
            type="number"
            min={0}
            max={100}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("progressPercent", {
              valueAsNumber: true,
            })}
          />
        </Field>
      </div>

      <Field
        id={`progress-summary-${treatmentPlanId}`}
        label="Progress summary"
        error={form.formState.errors.summary?.message}
      >
        <textarea
          id={`progress-summary-${treatmentPlanId}`}
          rows={4}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("summary")}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`progress-barriers-${treatmentPlanId}`}
          label="Barriers"
          error={form.formState.errors.barriers?.message}
        >
          <textarea
            id={`progress-barriers-${treatmentPlanId}`}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("barriers")}
          />
        </Field>
        <Field
          id={`progress-next-steps-${treatmentPlanId}`}
          label="Next steps"
          error={form.formState.errors.nextSteps?.message}
        >
          <textarea
            id={`progress-next-steps-${treatmentPlanId}`}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("nextSteps")}
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
        {isPending ? "Recording progress..." : "Record progress"}
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
