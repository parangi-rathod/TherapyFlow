"use server";

import { revalidatePath } from "next/cache";

import {
  buildMessagePreview,
  encryptMessageBody,
  hasMessageEncryptionConfig,
} from "@/lib/messages/crypto";
import { getCurrentPracticeContext } from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  MessageThreadSchema,
  SendMessageSchema,
  type MessageThreadSchemaInput,
  type SendMessageSchemaInput,
} from "@/lib/validations/message";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type ThreadRow = {
  id: string;
  client_id: string;
  therapist_user_id: string;
};

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
    throw new Error("Create a workspace before managing messages.");
  }

  return { supabase, user, practice };
}

async function getClientForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  practiceId: string,
  clientId: string,
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("practice_id", practiceId)
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (error || !client) {
    throw new Error("The selected client could not be found.");
  }

  return client;
}

async function getThreadForPractice(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  practiceId: string,
  threadId: string,
) {
  const { data: thread, error } = await supabase
    .from("message_threads")
    .select("id, client_id, therapist_user_id")
    .eq("practice_id", practiceId)
    .eq("id", threadId)
    .maybeSingle<ThreadRow>();

  if (error || !thread) {
    throw new Error("The selected message thread could not be found.");
  }

  return thread;
}

function revalidateMessagePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
}

function ensureMessagingConfigured() {
  if (!hasMessageEncryptionConfig()) {
    throw new Error(
      "Secure messaging is not configured. Add MESSAGE_ENCRYPTION_KEY.",
    );
  }
}

export async function createMessageThreadAction(
  input: MessageThreadSchemaInput,
): Promise<ActionResult> {
  const parsed = MessageThreadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid thread details.",
    };
  }

  try {
    ensureMessagingConfigured();

    const { supabase, user, practice } = await getUserAndPractice();
    await getClientForPractice(supabase, practice.id, parsed.data.clientId);

    const sentAt = new Date().toISOString();
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        practice_id: practice.id,
        client_id: parsed.data.clientId,
        therapist_user_id: user.id,
        subject: parsed.data.subject?.trim() || null,
        last_message_at: sentAt,
      })
      .select("id")
      .single<{ id: string }>();

    if (threadError || !thread) {
      return {
        success: false,
        error: threadError?.message ?? "Unable to create the message thread.",
      };
    }

    const { error: messageError } = await supabase.from("messages").insert({
      thread_id: thread.id,
      practice_id: practice.id,
      sender_user_id: user.id,
      body_encrypted: encryptMessageBody(parsed.data.initialMessage),
      body_preview: buildMessagePreview(parsed.data.initialMessage),
      sent_at: sentAt,
    });

    if (messageError) {
      return {
        success: false,
        error: messageError.message ?? "Unable to send the initial message.",
      };
    }

    revalidateMessagePaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the message thread.",
    };
  }
}

export async function sendMessageAction(
  input: SendMessageSchemaInput,
): Promise<ActionResult> {
  const parsed = SendMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message details.",
    };
  }

  try {
    ensureMessagingConfigured();

    const { supabase, user, practice } = await getUserAndPractice();
    const thread = await getThreadForPractice(supabase, practice.id, parsed.data.threadId);
    const sentAt = new Date().toISOString();
    const senderColumn =
      parsed.data.senderType === "client"
        ? { sender_client_id: thread.client_id }
        : { sender_user_id: user.id };

    const { error: messageError } = await supabase.from("messages").insert({
      thread_id: thread.id,
      practice_id: practice.id,
      body_encrypted: encryptMessageBody(parsed.data.body),
      body_preview: buildMessagePreview(parsed.data.body),
      sent_at: sentAt,
      ...senderColumn,
    });

    if (messageError) {
      return {
        success: false,
        error: messageError.message ?? "Unable to send the message.",
      };
    }

    const { error: threadError } = await supabase
      .from("message_threads")
      .update({ last_message_at: sentAt })
      .eq("id", thread.id)
      .eq("practice_id", practice.id);

    if (threadError) {
      return {
        success: false,
        error: threadError.message ?? "Unable to update the message thread.",
      };
    }

    revalidateMessagePaths();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to send the message.",
    };
  }
}
