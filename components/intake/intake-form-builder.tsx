"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
  createIntakeFormAction,
  updateIntakeFormAction,
} from "@/app/actions/intake-forms";
import {
  IntakeFormSchema,
  type IntakeFormSchemaInput,
} from "@/lib/validations/intake-form";

const formStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const;

const fieldTypeOptions = [
  { label: "Short text", value: "short_text" },
  { label: "Long text", value: "long_text" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Date", value: "date" },
  { label: "Number", value: "number" },
  { label: "Yes / No", value: "yes_no" },
  { label: "Single select", value: "single_select" },
  { label: "Multi select", value: "multi_select" },
] as const;

export type IntakeFormBuilderValues = IntakeFormSchemaInput & {
  id?: string;
};

type IntakeFormBuilderProps = {
  mode: "create" | "edit";
  initialValues: IntakeFormBuilderValues;
};

const blankField = {
  fieldId: "",
  label: "",
  fieldType: "short_text" as const,
  placeholder: "",
  helpText: "",
  optionValues: "",
  isRequired: false,
};

export function IntakeFormBuilder({
  mode,
  initialValues,
}: IntakeFormBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<IntakeFormSchemaInput>({
    resolver: zodResolver(IntakeFormSchema),
    defaultValues: initialValues,
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createIntakeFormAction(values)
          : await updateIntakeFormAction({
              id: initialValues.id ?? "",
              ...values,
            });

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to save the intake form.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Intake form created successfully."
          : "Intake form updated successfully.",
      );

      if (mode === "create") {
        form.reset({
          title: "",
          description: "",
          status: "draft",
          welcomeText: "",
          completionMessage: "",
          fields: [{ ...blankField }],
        });
      }

      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-intake-title`}
          label="Form title"
          error={form.formState.errors.title?.message}
        >
          <input
            id={`${mode}-intake-title`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("title")}
          />
        </Field>
        <Field
          id={`${mode}-intake-status`}
          label="Status"
          error={form.formState.errors.status?.message}
        >
          <select
            id={`${mode}-intake-status`}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("status")}
          >
            {formStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id={`${mode}-intake-description`}
        label="Description"
        error={form.formState.errors.description?.message}
      >
        <textarea
          id={`${mode}-intake-description`}
          rows={3}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...form.register("description")}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={`${mode}-welcome`}
          label="Welcome text"
          error={form.formState.errors.welcomeText?.message}
        >
          <textarea
            id={`${mode}-welcome`}
            rows={4}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("welcomeText")}
          />
        </Field>
        <Field
          id={`${mode}-completion`}
          label="Completion message"
          error={form.formState.errors.completionMessage?.message}
        >
          <textarea
            id={`${mode}-completion`}
            rows={4}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("completionMessage")}
          />
        </Field>
      </div>

      <section className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Fields
            </p>
            <h3 className="mt-2 text-xl font-semibold">Form questions</h3>
          </div>
          <button
            type="button"
            onClick={() => fieldArray.append({ ...blankField })}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Add field
          </button>
        </div>

        <div className="space-y-4">
          {fieldArray.fields.map((field, index) => {
            const savedFieldId = form.watch(`fields.${index}.fieldId`);
            const fieldType = form.watch(`fields.${index}.fieldType`);
            const allowRemove = mode === "create" || !savedFieldId;

            return (
              <article
                key={field.id}
                className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5"
              >
                <input type="hidden" {...form.register(`fields.${index}.fieldId`)} />
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h4 className="text-lg font-semibold">Question {index + 1}</h4>
                  {allowRemove ? (
                    <button
                      type="button"
                      onClick={() => fieldArray.remove(index)}
                      disabled={fieldArray.fields.length === 1}
                      className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove field
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Existing field kept for submission history
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-field-label-${index}`}
                    label="Label"
                    error={form.formState.errors.fields?.[index]?.label?.message}
                  >
                    <input
                      id={`${mode}-field-label-${index}`}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`fields.${index}.label`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-field-type-${index}`}
                    label="Field type"
                    error={form.formState.errors.fields?.[index]?.fieldType?.message}
                  >
                    <select
                      id={`${mode}-field-type-${index}`}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`fields.${index}.fieldType`)}
                    >
                      {fieldTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-field-placeholder-${index}`}
                    label="Placeholder"
                    error={
                      form.formState.errors.fields?.[index]?.placeholder?.message
                    }
                  >
                    <input
                      id={`${mode}-field-placeholder-${index}`}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`fields.${index}.placeholder`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-field-required-${index}`}
                    label="Required"
                    error={
                      form.formState.errors.fields?.[index]?.isRequired?.message
                    }
                  >
                    <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        {...form.register(`fields.${index}.isRequired`)}
                      />
                      This question must be answered
                    </label>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${mode}-field-help-${index}`}
                    label="Help text"
                    error={form.formState.errors.fields?.[index]?.helpText?.message}
                  >
                    <textarea
                      id={`${mode}-field-help-${index}`}
                      rows={3}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`fields.${index}.helpText`)}
                    />
                  </Field>
                  <Field
                    id={`${mode}-field-options-${index}`}
                    label={
                      fieldType === "single_select" || fieldType === "multi_select"
                        ? "Options"
                        : "Options"
                    }
                    error={
                      form.formState.errors.fields?.[index]?.optionValues?.message
                    }
                  >
                    <textarea
                      id={`${mode}-field-options-${index}`}
                      rows={3}
                      placeholder="Only used for select fields. One option per line."
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...form.register(`fields.${index}.optionValues`)}
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
            ? "Saving form..."
            : "Updating form..."
          : mode === "create"
            ? "Create intake form"
            : "Save intake form"}
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
