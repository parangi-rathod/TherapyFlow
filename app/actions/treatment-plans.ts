"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TreatmentPlanSchema,
  TreatmentProgressEntrySchema,
  UpdateTreatmentPlanSchema,
  type TreatmentGoalSchemaInput,
  type TreatmentPlanSchemaInput,
  type TreatmentProgressEntrySchemaInput,
  type UpdateTreatmentPlanSchemaInput,
} from "@/lib/validations/treatment-plan";

type ActionResult = {
  success: boolean;
  error?: string;
};

type TreatmentPlanRow = {
  id: string;
  status: "draft" | "active" | "completed" | "archived";
};

type TreatmentGoalRow = {
  id: string;
  treatment_plan_id: string;
};

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeInterventions(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function revalidateTreatmentPlanPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/treatment-plans");
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
    throw new Error("Create a workspace before managing treatment plans.");
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

async function getTreatmentPlanForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  treatmentPlanId: string,
  practiceId: string,
) {
  const { data: plan, error } = await supabase
    .from("treatment_plans")
    .select("id, status")
    .eq("id", treatmentPlanId)
    .eq("practice_id", practiceId)
    .maybeSingle<TreatmentPlanRow>();

  if (error || !plan) {
    throw new Error("The selected treatment plan could not be found.");
  }

  return plan;
}

async function getTreatmentGoalsForPlan(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  treatmentPlanId: string,
  practiceId: string,
) {
  const { data: goals, error } = await supabase
    .from("treatment_plan_goals")
    .select("id, treatment_plan_id")
    .eq("treatment_plan_id", treatmentPlanId)
    .eq("practice_id", practiceId);

  if (error) {
    throw new Error(error.message ?? "Unable to load treatment goals.");
  }

  return (goals ?? []) as TreatmentGoalRow[];
}

function buildGoalPayload(
  goal: TreatmentGoalSchemaInput,
  practiceId: string,
  treatmentPlanId: string,
  sortOrder: number,
) {
  return {
    practice_id: practiceId,
    treatment_plan_id: treatmentPlanId,
    title: goal.title,
    description: normalizeOptionalString(goal.description),
    interventions: normalizeInterventions(goal.interventions),
    target_date: normalizeOptionalDate(goal.targetDate),
    status: goal.status,
    progress_percent: goal.progressPercent,
    sort_order: sortOrder,
    last_progress_note: null,
    last_reviewed_at: null,
  };
}

async function syncTreatmentPlanGoals(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  practiceId: string;
  treatmentPlanId: string;
  goals: TreatmentGoalSchemaInput[];
}) {
  const existingGoals = await getTreatmentGoalsForPlan(
    input.supabase,
    input.treatmentPlanId,
    input.practiceId,
  );
  const existingGoalIds = new Set(existingGoals.map((goal) => goal.id));

  for (const [index, goal] of input.goals.entries()) {
    const basePayload = buildGoalPayload(
      goal,
      input.practiceId,
      input.treatmentPlanId,
      index,
    );

    if (goal.goalId && existingGoalIds.has(goal.goalId)) {
      const { error } = await input.supabase
        .from("treatment_plan_goals")
        .update({
          title: basePayload.title,
          description: basePayload.description,
          interventions: basePayload.interventions,
          target_date: basePayload.target_date,
          status: basePayload.status,
          progress_percent: basePayload.progress_percent,
          sort_order: basePayload.sort_order,
        })
        .eq("id", goal.goalId)
        .eq("practice_id", input.practiceId);

      if (error) {
        throw new Error(error.message ?? "Unable to update the treatment goal.");
      }

      continue;
    }

    const { error } = await input.supabase
      .from("treatment_plan_goals")
      .insert(basePayload);

    if (error) {
      throw new Error(error.message ?? "Unable to save the treatment goal.");
    }
  }
}

export async function createTreatmentPlanAction(
  input: TreatmentPlanSchemaInput,
): Promise<ActionResult> {
  const parsed = TreatmentPlanSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid treatment plan details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    await assertClientInPractice(supabase, parsed.data.clientId, practice.id);

    const { data: plan, error: planError } = await supabase
      .from("treatment_plans")
      .insert({
        practice_id: practice.id,
        client_id: parsed.data.clientId,
        created_by_user_id: user.id,
        title: parsed.data.title,
        summary: normalizeOptionalString(parsed.data.summary),
        status: parsed.data.status,
        start_date: parsed.data.startDate,
        target_review_date: normalizeOptionalDate(parsed.data.targetReviewDate),
      })
      .select("id")
      .single<{ id: string }>();

    if (planError || !plan) {
      return {
        success: false,
        error: planError?.message ?? "Unable to create the treatment plan.",
      };
    }

    try {
      await syncTreatmentPlanGoals({
        supabase,
        practiceId: practice.id,
        treatmentPlanId: plan.id,
        goals: parsed.data.goals,
      });
    } catch (error) {
      await supabase.from("treatment_plans").delete().eq("id", plan.id);
      throw error;
    }

    revalidateTreatmentPlanPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the treatment plan.",
    };
  }
}

export async function updateTreatmentPlanAction(
  input: UpdateTreatmentPlanSchemaInput,
): Promise<ActionResult> {
  const parsed = UpdateTreatmentPlanSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid treatment plan details.",
    };
  }

  try {
    const { supabase, practice } = await getUserAndPractice();
    await assertClientInPractice(supabase, parsed.data.clientId, practice.id);
    await getTreatmentPlanForPractice(supabase, parsed.data.id, practice.id);

    const { error: planError } = await supabase
      .from("treatment_plans")
      .update({
        client_id: parsed.data.clientId,
        title: parsed.data.title,
        summary: normalizeOptionalString(parsed.data.summary),
        status: parsed.data.status,
        start_date: parsed.data.startDate,
        target_review_date: normalizeOptionalDate(parsed.data.targetReviewDate),
      })
      .eq("id", parsed.data.id)
      .eq("practice_id", practice.id);

    if (planError) {
      return {
        success: false,
        error: planError.message ?? "Unable to update the treatment plan.",
      };
    }

    await syncTreatmentPlanGoals({
      supabase,
      practiceId: practice.id,
      treatmentPlanId: parsed.data.id,
      goals: parsed.data.goals,
    });

    revalidateTreatmentPlanPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the treatment plan.",
    };
  }
}

export async function recordTreatmentPlanProgressAction(
  input: TreatmentProgressEntrySchemaInput,
): Promise<ActionResult> {
  const parsed = TreatmentProgressEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid treatment progress details.",
    };
  }

  try {
    const { supabase, user, practice } = await getUserAndPractice();
    const plan = await getTreatmentPlanForPractice(
      supabase,
      parsed.data.treatmentPlanId,
      practice.id,
    );
    const goals = await getTreatmentGoalsForPlan(
      supabase,
      parsed.data.treatmentPlanId,
      practice.id,
    );
    const selectedGoal = goals.find((goal) => goal.id === parsed.data.goalId);

    if (!selectedGoal) {
      return {
        success: false,
        error: "The selected treatment goal could not be found.",
      };
    }

    const { error: progressError } = await supabase
      .from("treatment_plan_progress_entries")
      .insert({
        practice_id: practice.id,
        treatment_plan_id: parsed.data.treatmentPlanId,
        goal_id: parsed.data.goalId,
        author_user_id: user.id,
        summary: parsed.data.summary,
        barriers: normalizeOptionalString(parsed.data.barriers),
        next_steps: normalizeOptionalString(parsed.data.nextSteps),
        progress_percent: parsed.data.progressPercent,
        status: parsed.data.goalStatus,
      });

    if (progressError) {
      return {
        success: false,
        error:
          progressError.message ?? "Unable to record the progress update.",
      };
    }

    const { error: goalError } = await supabase
      .from("treatment_plan_goals")
      .update({
        progress_percent: parsed.data.progressPercent,
        status: parsed.data.goalStatus,
        last_progress_note: parsed.data.summary,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.goalId)
      .eq("practice_id", practice.id);

    if (goalError) {
      return {
        success: false,
        error: goalError.message ?? "Unable to update the treatment goal.",
      };
    }

    if (plan.status !== "archived") {
      const { data: refreshedGoals, error: refreshedGoalsError } = await supabase
        .from("treatment_plan_goals")
        .select("status")
        .eq("treatment_plan_id", parsed.data.treatmentPlanId)
        .eq("practice_id", practice.id);

      if (!refreshedGoalsError && refreshedGoals?.length) {
        const allAchieved = refreshedGoals.every(
          (goal) => goal.status === "achieved",
        );

        if (allAchieved) {
          await supabase
            .from("treatment_plans")
            .update({ status: "completed" satisfies TreatmentPlanRow["status"] })
            .eq("id", parsed.data.treatmentPlanId)
            .eq("practice_id", practice.id);
        }
      }
    }

    revalidateTreatmentPlanPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record the progress update.",
    };
  }
}
