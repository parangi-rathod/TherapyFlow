import { notFound } from "next/navigation";

import { PublicIntakeForm } from "@/components/intake/public-intake-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Complete Intake | TherapyFlow",
};

type PublicField = {
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
  sortOrder: number;
};

type PublicPayload = {
  requestStatus?: "pending" | "submitted" | "expired" | "cancelled";
  expiresAt?: string | null;
  practiceName?: string;
  clientName?: string;
  title?: string;
  description?: string | null;
  welcomeText?: string | null;
  completionMessage?: string | null;
  fields?: PublicField[];
};

function parsePublicPayload(value: unknown): PublicPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;

  return {
    requestStatus:
      typeof payload.requestStatus === "string"
        ? (payload.requestStatus as PublicPayload["requestStatus"])
        : undefined,
    expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null,
    practiceName:
      typeof payload.practiceName === "string" ? payload.practiceName : undefined,
    clientName:
      typeof payload.clientName === "string" ? payload.clientName : undefined,
    title: typeof payload.title === "string" ? payload.title : undefined,
    description:
      typeof payload.description === "string" ? payload.description : null,
    welcomeText:
      typeof payload.welcomeText === "string" ? payload.welcomeText : null,
    completionMessage:
      typeof payload.completionMessage === "string"
        ? payload.completionMessage
        : null,
    fields: Array.isArray(payload.fields)
      ? payload.fields
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return null;
            }

            const field = item as Record<string, unknown>;
            return {
              id: typeof field.id === "string" ? field.id : "",
              label: typeof field.label === "string" ? field.label : "Field",
              fieldType:
                typeof field.fieldType === "string"
                  ? (field.fieldType as PublicField["fieldType"])
                  : "short_text",
              placeholder:
                typeof field.placeholder === "string" ? field.placeholder : null,
              helpText: typeof field.helpText === "string" ? field.helpText : null,
              optionValues: Array.isArray(field.optionValues)
                ? field.optionValues.filter(
                    (option): option is string => typeof option === "string",
                  )
                : [],
              isRequired: field.isRequired === true,
              sortOrder:
                typeof field.sortOrder === "number" ? field.sortOrder : 0,
            } satisfies PublicField;
          })
          .filter((item): item is PublicField => Boolean(item))
      : [],
  };
}

function statusCopy(status: NonNullable<PublicPayload["requestStatus"]>) {
  if (status === "submitted") {
    return "This intake form has already been submitted.";
  }

  if (status === "expired") {
    return "This intake form link has expired.";
  }

  if (status === "cancelled") {
    return "This intake form request has been cancelled.";
  }

  return "This intake form is unavailable.";
}

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_public_intake_request", {
    raw_token: token,
  });

  if (error) {
    throw error;
  }

  const payload = parsePublicPayload(data);

  if (!payload) {
    notFound();
  }

  if (payload.requestStatus !== "pending") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Intake status
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Intake form unavailable
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {statusCopy(payload.requestStatus ?? "cancelled")}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16 md:px-10">
      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {payload.practiceName ?? "TherapyFlow"} intake
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
          {payload.title ?? "Intake form"}
        </h1>
        {payload.clientName ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Completing for {payload.clientName}
          </p>
        ) : null}
        {payload.description ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {payload.description}
          </p>
        ) : null}
        {payload.welcomeText ? (
          <div className="mt-6 rounded-2xl border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
            {payload.welcomeText}
          </div>
        ) : null}
        <div className="mt-6">
          <PublicIntakeForm token={token} fields={payload.fields ?? []} />
        </div>
        {payload.completionMessage ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Completion message preview: {payload.completionMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
