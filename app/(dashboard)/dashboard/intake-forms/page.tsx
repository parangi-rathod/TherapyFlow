import Link from "next/link";
import { redirect } from "next/navigation";

import {
  IntakeFormBuilder,
  type IntakeFormBuilderValues,
} from "@/components/intake/intake-form-builder";
import { IntakeRequestForm } from "@/components/intake/intake-request-form";
import { IntakeReviewForm } from "@/components/intake/intake-review-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Intake Forms | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type IntakeFormRow = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  welcome_text: string | null;
  completion_message: string | null;
  created_at: string;
};

type IntakeFieldRow = {
  id: string;
  intake_form_id: string;
  label: string;
  field_type:
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
  help_text: string | null;
  option_values: string[];
  is_required: boolean;
  sort_order: number;
};

type IntakeRequestRow = {
  id: string;
  intake_form_id: string;
  client_id: string;
  request_status: "pending" | "submitted" | "expired" | "cancelled";
  expires_at: string | null;
  submitted_at: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
};

type IntakeSubmissionRow = {
  id: string;
  intake_form_request_id: string;
  intake_form_id: string;
  client_id: string;
  responses: unknown;
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, " ");
}

function parseResponseMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, string | boolean | string[]>;
}

function renderResponseValue(value: string | boolean | string[] | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value && value.trim().length > 0 ? value : "No response";
}

function mapFormToBuilderValues(
  form: IntakeFormRow,
  fields: IntakeFieldRow[],
): IntakeFormBuilderValues {
  return {
    id: form.id,
    title: form.title,
    description: form.description ?? "",
    status: form.status,
    welcomeText: form.welcome_text ?? "",
    completionMessage: form.completion_message ?? "",
    fields: fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      fieldType: field.field_type,
      placeholder: field.placeholder ?? "",
      helpText: field.help_text ?? "",
      optionValues: field.option_values.join("\n"),
      isRequired: field.is_required,
    })),
  };
}

async function getPageData() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    return {
      practice: null,
      clients: [] as ClientRow[],
      intakeForms: [] as IntakeFormRow[],
      intakeFields: [] as IntakeFieldRow[],
      intakeRequests: [] as IntakeRequestRow[],
      intakeSubmissions: [] as IntakeSubmissionRow[],
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: intakeForms, error: intakeFormsError },
    { data: intakeFields, error: intakeFieldsError },
    { data: intakeRequests, error: intakeRequestsError },
    { data: intakeSubmissions, error: intakeSubmissionsError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("intake_forms")
      .select(
        "id, title, description, status, welcome_text, completion_message, created_at",
      )
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("intake_form_fields")
      .select(
        "id, intake_form_id, label, field_type, placeholder, help_text, option_values, is_required, sort_order",
      )
      .eq("practice_id", practice.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("intake_form_requests")
      .select(
        "id, intake_form_id, client_id, request_status, expires_at, submitted_at, submitted_by_name, submitted_by_email, created_at",
      )
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("intake_form_submissions")
      .select(
        "id, intake_form_request_id, intake_form_id, client_id, responses, submitted_at, reviewed_at, review_notes",
      )
      .eq("practice_id", practice.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (clientsError) {
    throw clientsError;
  }

  if (intakeFormsError) {
    throw intakeFormsError;
  }

  if (intakeFieldsError) {
    throw intakeFieldsError;
  }

  if (intakeRequestsError) {
    throw intakeRequestsError;
  }

  if (intakeSubmissionsError) {
    throw intakeSubmissionsError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    intakeForms: (intakeForms ?? []) as IntakeFormRow[],
    intakeFields: (intakeFields ?? []) as IntakeFieldRow[],
    intakeRequests: (intakeRequests ?? []) as IntakeRequestRow[],
    intakeSubmissions: (intakeSubmissions ?? []) as IntakeSubmissionRow[],
  };
}

function SummaryCards({
  practice,
  intakeForms,
  intakeRequests,
  intakeSubmissions,
}: {
  practice: PracticeContext;
  intakeForms: IntakeFormRow[];
  intakeRequests: IntakeRequestRow[];
  intakeSubmissions: IntakeSubmissionRow[];
}) {
  const publishedForms = intakeForms.filter((form) => form.status === "published");
  const pendingRequests = intakeRequests.filter(
    (request) => request.request_status === "pending",
  );
  const reviewedSubmissions = intakeSubmissions.filter(
    (submission) => submission.reviewed_at,
  );

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Published forms</p>
        <h2 className="mt-3 text-3xl font-semibold">{publishedForms.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Total forms: {intakeForms.length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Requests and reviews</p>
        <h2 className="mt-3 text-3xl font-semibold">{pendingRequests.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reviewed submissions: {reviewedSubmissions.length}
        </p>
      </article>
    </section>
  );
}

export default async function IntakeFormsPage() {
  const {
    practice,
    clients,
    intakeForms,
    intakeFields,
    intakeRequests,
    intakeSubmissions,
  } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before managing intake forms
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Intake forms are practice-scoped and feed into the clinical record.
            Start by setting up the workspace on the dashboard.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open dashboard setup
          </Link>
        </section>
      </main>
    );
  }

  if (clients.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Client roster required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Add a client before sending intake forms
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Intake requests are tied to a client record. Create at least one
            client first, then return here to send forms and review submissions.
          </p>
          <Link
            href="/dashboard/clients"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open client management
          </Link>
        </section>
      </main>
    );
  }

  const fieldsByFormId = new Map<string, IntakeFieldRow[]>();
  const submissionsByRequestId = new Map<string, IntakeSubmissionRow>();
  const clientNameById = new Map(
    clients.map((client) => [client.id, `${client.first_name} ${client.last_name}`]),
  );

  for (const field of intakeFields) {
    const formFields = fieldsByFormId.get(field.intake_form_id) ?? [];
    formFields.push(field);
    fieldsByFormId.set(field.intake_form_id, formFields);
  }

  for (const submission of intakeSubmissions) {
    submissionsByRequestId.set(submission.intake_form_request_id, submission);
  }

  const publishedFormOptions = intakeForms
    .filter((form) => form.status === "published")
    .map((form) => ({ id: form.id, name: form.title }));
  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Intake forms
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Intake Forms
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create digital intake packets, send public completion links to
            clients, and review submitted responses inside {practice.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Back to dashboard
          </Link>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            Open clients
          </Link>
        </div>
      </header>

      <SummaryCards
        practice={practice}
        intakeForms={intakeForms}
        intakeRequests={intakeRequests}
        intakeSubmissions={intakeSubmissions}
      />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New form
          </p>
          <h2 className="text-2xl font-semibold">Create an intake template</h2>
        </div>
        <div className="mt-6">
          <IntakeFormBuilder
            mode="create"
            initialValues={{
              title: "",
              description: "",
              status: "draft",
              welcomeText: "",
              completionMessage: "",
              fields: [
                {
                  fieldId: "",
                  label: "",
                  fieldType: "short_text",
                  placeholder: "",
                  helpText: "",
                  optionValues: "",
                  isRequired: false,
                },
              ],
            }}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New request
          </p>
          <h2 className="text-2xl font-semibold">Send a client intake link</h2>
        </div>
        <div className="mt-6">
          {publishedFormOptions.length > 0 ? (
            <IntakeRequestForm
              clientOptions={clientOptions}
              formOptions={publishedFormOptions}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Publish at least one intake form before creating a client request.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Existing forms
          </p>
          <h2 className="text-2xl font-semibold">Manage templates and submissions</h2>
        </div>

        {intakeForms.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No intake forms yet. Create the first template above.
          </article>
        ) : (
          intakeForms.map((form) => {
            const formFields = fieldsByFormId.get(form.id) ?? [];
            const formRequests = intakeRequests.filter(
              (request) => request.intake_form_id === form.id,
            );

            return (
              <article
                key={form.id}
                className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">{form.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {titleCase(form.status)} • {formFields.length} questions
                  </p>
                  {form.description ? (
                    <p className="text-sm text-muted-foreground">
                      {form.description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm font-medium text-foreground">Welcome text</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {form.welcome_text ?? "No welcome text configured."}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm font-medium text-foreground">Completion message</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {form.completion_message ?? "No completion message configured."}
                    </p>
                  </article>
                </div>

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Requests
                    </p>
                    <h4 className="text-xl font-semibold">Client completions</h4>
                  </div>

                  <div className="mt-5 space-y-4">
                    {formRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No requests created for this form yet.
                      </p>
                    ) : (
                      formRequests.map((request) => {
                        const submission = submissionsByRequestId.get(request.id);
                        const responses = parseResponseMap(submission?.responses);

                        return (
                          <article
                            key={request.id}
                            className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5"
                          >
                            <div className="space-y-2">
                              <h5 className="text-lg font-semibold">
                                {clientNameById.get(request.client_id) ?? "Unknown client"}
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                {titleCase(request.request_status)} • Created{" "}
                                {formatDateTime(request.created_at)} • Expires{" "}
                                {formatDate(request.expires_at)}
                              </p>
                              {request.submitted_at ? (
                                <p className="text-sm text-muted-foreground">
                                  Submitted {formatDateTime(request.submitted_at)}
                                  {request.submitted_by_name
                                    ? ` by ${request.submitted_by_name}`
                                    : ""}
                                  {request.submitted_by_email
                                    ? ` (${request.submitted_by_email})`
                                    : ""}
                                </p>
                              ) : null}
                            </div>

                            {submission ? (
                              <div className="mt-5 space-y-5">
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                  <p className="text-sm font-medium text-foreground">
                                    Submitted responses
                                  </p>
                                  <div className="mt-3 space-y-3">
                                    {formFields.map((field) => (
                                      <div key={field.id}>
                                        <p className="text-sm font-medium text-foreground">
                                          {field.label}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                          {renderResponseValue(responses[field.id])}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                  <p className="text-sm font-medium text-foreground">
                                    Review status
                                  </p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    Reviewed {formatDateTime(submission.reviewed_at)}
                                  </p>
                                  <div className="mt-4">
                                    <IntakeReviewForm
                                      submissionId={submission.id}
                                      initialReviewNotes={submission.review_notes ?? ""}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-background/70 p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Template
                    </p>
                    <h4 className="text-xl font-semibold">Edit intake form</h4>
                  </div>
                  <div className="mt-5">
                    <IntakeFormBuilder
                      mode="edit"
                      initialValues={mapFormToBuilderValues(form, formFields)}
                    />
                  </div>
                </section>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
