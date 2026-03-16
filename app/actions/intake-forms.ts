"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  IntakeFormSchema,
  PublicIntakeSubmissionSchema,
  IntakeRequestSchema,
  IntakeSubmissionReviewSchema,
  UpdateIntakeFormSchema,
  type IntakeFieldSchemaInput,
  type IntakeFormSchemaInput,
  type IntakeRequestSchemaInput,
  type IntakeSubmissionReviewSchemaInput,
  type PublicIntakeSubmissionSchemaInput,
  type UpdateIntakeFormSchemaInput,
} from "@/lib/validations/intake-form";

type ActionResult = {
  success: boolean;
  error?: string;
};

type CreateRequestResult = ActionResult & {
  sharePath?: string;
};

type IntakeFormRow = {
  id: string;
  status?: "draft" | "published" | "archived";
};

type IntakeFieldRow = {
  id: string;
};

type IntakeSubmissionRow = {
  id: string;
};

type PublicIntakeField = {
  id: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
};

type PublicIntakeRequestPayload = {
  requestStatus?: string;
  fields?: PublicIntakeField[];
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? new Date(trimmed).toISOString() : null;
}

function normalizeOptionValues(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hashRequestToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function revalidateIntakePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake-forms");
}

function parsePublicIntakeRequestPayload(
  payload: unknown,
): PublicIntakeRequestPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  return {
    requestStatus:
      typeof candidate.requestStatus === "string"
        ? candidate.requestStatus
        : undefined,
    fields: Array.isArray(candidate.fields)
      ? candidate.fields
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return null;
            }

            const field = item as Record<string, unknown>;
            return {
              id: typeof field.id === "string" ? field.id : "",
              label: typeof field.label === "string" ? field.label : "Field",
              fieldType:
                typeof field.fieldType === "string" ? field.fieldType : "short_text",
              isRequired: field.isRequired === true,
            } satisfies PublicIntakeField;
          })
          .filter((item): item is PublicIntakeField => Boolean(item))
      : [],
  };
}

function hasRequiredResponse(
  value: string | boolean | string[] | undefined,
  fieldType: string,
) {
  if (fieldType === "yes_no") {
    return typeof value === "boolean";
  }

  if (fieldType === "multi_select") {
    return Array.isArray(value) && value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

async function getUserAndPractice() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const practice = await getCurrentPracticeContext(supabase, user.id);

  if (!practice) {
    throw new Error("Create a workspace before managing intake forms.");
  }

  return { supabase, user, practice };
}

async function assertClientInPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
  practiceId: string,
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("practice_id", practiceId)
    .maybeSingle<{ id: string }>();

  if (error || !client) {
    throw new Error("The selected client could not be found.");
  }
}

async function assertIntakeFormInPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  intakeFormId: string,
  practiceId: string,
) {
  const { data: form, error } = await supabase
    .from("intake_forms")
    .select("id")
    .eq("id", intakeFormId)
    .eq("practice_id", practiceId)
    .maybeSingle<IntakeFormRow>();

  if (error || !form) {
    throw new Error("The selected intake form could not be found.");
  }
}

async function getFormFieldsForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  intakeFormId: string,
  practiceId: string,
) {
  const { data: fields, error } = await supabase
    .from("intake_form_fields")
    .select("id")
    .eq("intake_form_id", intakeFormId)
    .eq("practice_id", practiceId);

  if (error) {
    throw new Error(error.message ?? "Unable to load intake form fields.");
  }

  return (fields ?? []) as IntakeFieldRow[];
}

async function syncIntakeFormFields(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  practiceId: string;
  intakeFormId: string;
  fields: IntakeFieldSchemaInput[];
}) {
  const existingFields = await getFormFieldsForPractice(
    input.supabase,
    input.intakeFormId,
    input.practiceId,
  );
  const existingFieldIds = new Set(existingFields.map((field) => field.id));

  for (const [index, field] of input.fields.entries()) {
    const payload = {
      practice_id: input.practiceId,
      intake_form_id: input.intakeFormId,
      label: field.label,
      field_type: field.fieldType,
      placeholder: normalizeOptionalString(field.placeholder),
      help_text: normalizeOptionalString(field.helpText),
      option_values: normalizeOptionValues(field.optionValues),
      is_required: field.isRequired,
      sort_order: index,
    };

    if (field.fieldId && existingFieldIds.has(field.fieldId)) {
      const { error } = await input.supabase
        .from("intake_form_fields")
        .update(payload)
        .eq("id", field.fieldId)
        .eq("practice_id", input.practiceId);

      if (error) {
        throw new Error(error.message ?? "Unable to update the intake field.");
      }

      continue;
    }

    const { error } = await input.supabase.from("intake_form_fields").insert(payload);

    if (error) {
      throw new Error(error.message ?? "Unable to save the intake field.");
    }
  }
}

export async function createIntakeFormAction(
  input: IntakeFormSchemaInput,
): Promise<ActionResult> {
  const parsed = IntakeFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid intake form details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { data: form, error } = await supabase
      .from("intake_forms")
      .insert({
        practice_id: practice.id,
        created_by_user_id: user.id,
        title: parsed.data.title,
        description: normalizeOptionalString(parsed.data.description),
        status: parsed.data.status,
        welcome_text: normalizeOptionalString(parsed.data.welcomeText),
        completion_message: normalizeOptionalString(parsed.data.completionMessage),
      })
      .select("id")
      .single<IntakeFormRow>();

    if (error || !form) {
      return {
        success: false,
        error: error?.message ?? "Unable to create the intake form.",
      };
    }

    try {
      await syncIntakeFormFields({
        supabase,
        practiceId: practice.id,
        intakeFormId: form.id,
        fields: parsed.data.fields,
      });
    } catch (fieldError) {
      await supabase.from("intake_forms").delete().eq("id", form.id);
      throw fieldError;
    }

    revalidateIntakePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create the intake form.",
    };
  }
}

export async function updateIntakeFormAction(
  input: UpdateIntakeFormSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateIntakeFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid intake form details.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    await assertIntakeFormInPractice(supabase, parsed.data.id, practice.id);

    const { error } = await supabase
      .from("intake_forms")
      .update({
        title: parsed.data.title,
        description: normalizeOptionalString(parsed.data.description),
        status: parsed.data.status,
        welcome_text: normalizeOptionalString(parsed.data.welcomeText),
        completion_message: normalizeOptionalString(parsed.data.completionMessage),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to update the intake form.",
      };
    }

    await syncIntakeFormFields({
      supabase,
      practiceId: practice.id,
      intakeFormId: parsed.data.id,
      fields: parsed.data.fields,
    });

    revalidateIntakePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the intake form.",
    };
  }
}

export async function createIntakeRequestAction(
  input: IntakeRequestSchemaInput,
): Promise<CreateRequestResult> {
  const parsed = IntakeRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid intake request details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { data: intakeForm, error: intakeFormError } = await supabase
      .from("intake_forms")
      .select("id, status")
      .eq("id", parsed.data.intakeFormId)
      .eq("practice_id", practice.id)
      .maybeSingle<IntakeFormRow>();

    if (intakeFormError || !intakeForm) {
      return {
        success: false,
        error: "The selected intake form could not be found.",
      };
    }

    if (intakeForm.status !== "published") {
      return {
        success: false,
        error: "Publish the intake form before sending it to a client.",
      };
    }

    await assertClientInPractice(supabase, parsed.data.clientId, practice.id);

    const rawToken = `${randomUUID()}${randomUUID().replace(/-/g, "")}`;
    const tokenHash = hashRequestToken(rawToken);

    const { error } = await supabase.from("intake_form_requests").insert({
      practice_id: practice.id,
      intake_form_id: parsed.data.intakeFormId,
      client_id: parsed.data.clientId,
      created_by_user_id: user.id,
      request_token_hash: tokenHash,
      request_status: "pending",
      expires_at: normalizeOptionalDate(parsed.data.expiresAt),
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to create the intake request.",
      };
    }

    revalidateIntakePaths();

    return {
      success: true,
      sharePath: `/intake/${rawToken}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create the intake request.",
    };
  }
}

export async function reviewIntakeSubmissionAction(
  input: IntakeSubmissionReviewSchemaInput,
): Promise<ActionResult> {
  const parsed = IntakeSubmissionReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const { data: submission, error: submissionError } = await supabase
      .from("intake_form_submissions")
      .select("id")
      .eq("id", parsed.data.submissionId)
      .eq("practice_id", practice.id)
      .maybeSingle<IntakeSubmissionRow>();

    if (submissionError || !submission) {
      return {
        success: false,
        error: "The selected intake submission could not be found.",
      };
    }

    const { error } = await supabase
      .from("intake_form_submissions")
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: user.id,
        review_notes: normalizeOptionalString(parsed.data.reviewNotes),
      })
      .eq("id", parsed.data.submissionId)
      .eq("practice_id", practice.id);

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to save the review.",
      };
    }

    revalidateIntakePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save the review.",
    };
  }
}

export async function submitPublicIntakeAction(
  rawToken: string,
  input: PublicIntakeSubmissionSchemaInput,
): Promise<ActionResult> {
  const parsed = PublicIntakeSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid intake submission details.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: requestPayload, error: requestError } = await supabase.rpc(
      "get_public_intake_request",
      {
        raw_token: rawToken,
      },
    );

    if (requestError) {
      return {
        success: false,
        error: requestError.message ?? "Unable to load the intake request.",
      };
    }

    const request = parsePublicIntakeRequestPayload(requestPayload);

    if (!request || request.requestStatus !== "pending") {
      return {
        success: false,
        error: "This intake request is no longer accepting responses.",
      };
    }

    const missingRequiredField = (request.fields ?? []).find(
      (field) =>
        field.isRequired &&
        !hasRequiredResponse(
          parsed.data.responses[field.id],
          field.fieldType,
        ),
    );

    if (missingRequiredField) {
      return {
        success: false,
        error: `${missingRequiredField.label} is required.`,
      };
    }

    const { error } = await supabase.rpc("submit_public_intake_request", {
      raw_token: rawToken,
      submitter_name: normalizeOptionalString(parsed.data.submitterName),
      submitter_email: normalizeOptionalString(parsed.data.submitterEmail),
      response_payload: parsed.data.responses,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Unable to submit the intake form.",
      };
    }

    revalidatePath(`/intake/${rawToken}`);
    revalidateIntakePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to submit the intake form.",
    };
  }
}
