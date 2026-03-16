import { NextResponse } from "next/server";

import { processDueEmailReminders } from "@/lib/reminders/delivery";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request) {
  const secret = process.env.REMINDER_PROCESSING_SECRET;

  if (!secret) {
    throw new Error(
      "Missing REMINDER_PROCESSING_SECRET. Configure it before using the reminder processing API.",
    );
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const directHeader = request.headers.get("x-reminder-secret");

  return bearer === secret || directHeader === secret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const summary = await processDueEmailReminders({ supabase });

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process email reminders.",
      },
      { status: 500 },
    );
  }
}
