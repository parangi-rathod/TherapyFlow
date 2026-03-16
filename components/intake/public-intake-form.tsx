"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitPublicIntakeAction } from "@/app/actions/intake-forms";

type PublicIntakeField = {
  id: string;
  label: string;
  fieldType:
    | "short_text"
    | "long_text"
    | "email"
    | "phone"
    | "date"
    | "number"
    | "yes_no"
    | "single_select"
    | "multi_select";
  placeholder: string | null;
  helpText: string | null;
  optionValues: string[];
  isRequired: boolean;
};

type PublicIntakeFormProps = {
  token: string;
  fields: PublicIntakeField[];
};

type ResponseValue = string | boolean | string[];

function getInitialResponses(fields: PublicIntakeField[]) {
  return fields.reduce<Record<string, ResponseValue>>((accumulator, field) => {
    accumulator[field.id] =
      field.fieldType === "yes_no"
        ? false
        : field.fieldType === "multi_select"
          ? []
          : "";
    return accumulator;
  }, {});
}

function hasValue(field: PublicIntakeField, value: ResponseValue | undefined) {
  if (field.fieldType === "yes_no") {
    return typeof value === "boolean";
  }

  if (field.fieldType === "multi_select") {
    return Array.isArray(value) && value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function PublicIntakeForm({ token, fields }: PublicIntakeFormProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(
    () => getInitialResponses(fields),
  );
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const missingRequired = fields.find(
    (field) => field.isRequired && !hasValue(field, responses[field.id]),
  );

  function updateValue(fieldId: string, value: ResponseValue) {
    setResponses((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (missingRequired) {
          setErrorMessage(`${missingRequired.label} is required.`);
          return;
        }

        startTransition(async () => {
          const result = await submitPublicIntakeAction(token, {
            submitterName,
            submitterEmail,
            responses,
          });

          if (!result.success) {
            setErrorMessage(result.error ?? "Unable to submit the intake form.");
            return;
          }

          setSuccessMessage("Intake form submitted successfully.");
          router.refresh();
        });
      }}
    >
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="submitter-name">
            Your name
          </label>
          <input
            id="submitter-name"
            value={submitterName}
            onChange={(event) => setSubmitterName(event.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="submitter-email">
            Your email
          </label>
          <input
            id="submitter-email"
            type="email"
            value={submitterEmail}
            onChange={(event) => setSubmitterEmail(event.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      <section className="space-y-5">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label className="text-sm font-medium" htmlFor={field.id}>
              {field.label}
              {field.isRequired ? " *" : ""}
            </label>
            {renderField(field, responses[field.id], updateValue)}
            {field.helpText ? (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            ) : null}
          </div>
        ))}
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
        {isPending ? "Submitting intake..." : "Submit intake form"}
      </button>
    </form>
  );
}

function renderField(
  field: PublicIntakeField,
  value: ResponseValue | undefined,
  onChange: (fieldId: string, value: ResponseValue) => void,
) {
  const commonClassName =
    "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (field.fieldType === "long_text") {
    return (
      <textarea
        id={field.id}
        rows={5}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder ?? ""}
        onChange={(event) => onChange(field.id, event.target.value)}
        className={commonClassName}
      />
    );
  }

  if (field.fieldType === "yes_no") {
    return (
      <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 text-sm">
        <input
          id={field.id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(field.id, event.target.checked)}
        />
        Yes
      </label>
    );
  }

  if (field.fieldType === "single_select") {
    return (
      <select
        id={field.id}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(field.id, event.target.value)}
        className={commonClassName}
      >
        <option value="">Select an option</option>
        {field.optionValues.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.fieldType === "multi_select") {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-2 rounded-2xl border border-input bg-background px-4 py-3 text-sm">
        {field.optionValues.map((option) => (
          <label key={option} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange(field.id, [...selected, option]);
                  return;
                }

                onChange(
                  field.id,
                  selected.filter((item) => item !== option),
                );
              }}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      id={field.id}
      type={
        field.fieldType === "email"
          ? "email"
          : field.fieldType === "phone"
            ? "tel"
            : field.fieldType === "date"
              ? "date"
              : field.fieldType === "number"
                ? "number"
                : "text"
      }
      value={typeof value === "string" ? value : ""}
      placeholder={field.placeholder ?? ""}
      onChange={(event) => onChange(field.id, event.target.value)}
      className={commonClassName}
    />
  );
}
