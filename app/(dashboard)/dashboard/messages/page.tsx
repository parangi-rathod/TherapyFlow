import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HeartHandshake,
  LockKeyhole,
  MailPlus,
  MessageSquareHeart,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { MessageComposerForm } from "@/components/messages/message-composer-form";
import { MessageThreadForm } from "@/components/messages/message-thread-form";
import {
  decryptMessageBody,
  hasMessageEncryptionConfig,
} from "@/lib/messages/crypto";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Messages | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

type ThreadRow = {
  id: string;
  client_id: string;
  therapist_user_id: string;
  subject: string | null;
  last_message_at: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_client_id: string | null;
  body_encrypted: string;
  body_preview: string | null;
  sent_at: string;
  read_at: string | null;
};

type ThreadViewModel = {
  id: string;
  subject: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  clientName: string;
  clientEmail: string | null;
  messages: Array<{
    id: string;
    senderType: "therapist" | "client";
    body: string;
    sentAt: string;
    readAt: string | null;
  }>;
};

function formatFriendly(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  const hasEncryptionConfig = hasMessageEncryptionConfig();

  if (!practice) {
    return {
      practice: null,
      clients: [] as ClientRow[],
      threads: [] as ThreadViewModel[],
      hasEncryptionConfig,
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: threads, error: threadsError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, email")
      .eq("practice_id", practice.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("message_threads")
      .select("id, client_id, therapist_user_id, subject, last_message_at, created_at")
      .eq("practice_id", practice.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, sender_client_id, body_encrypted, body_preview, sent_at, read_at")
      .eq("practice_id", practice.id)
      .order("sent_at", { ascending: true }),
  ]);

  if (clientsError) {
    throw clientsError;
  }

  if (threadsError) {
    throw threadsError;
  }

  if (messagesError) {
    throw messagesError;
  }

  const clientMap = new Map(
    ((clients ?? []) as ClientRow[]).map((client) => [
      client.id,
      {
        name: `${client.first_name} ${client.last_name}`.trim(),
        email: client.email,
      },
    ]),
  );
  const groupedMessages = new Map<string, MessageRow[]>();

  for (const message of (messages ?? []) as MessageRow[]) {
    const existing = groupedMessages.get(message.thread_id) ?? [];
    existing.push(message);
    groupedMessages.set(message.thread_id, existing);
  }

  const threadViewModels: ThreadViewModel[] = ((threads ?? []) as ThreadRow[]).map(
    (thread) => {
      const client = clientMap.get(thread.client_id);
      const threadMessages: ThreadViewModel["messages"] = (
        groupedMessages.get(thread.id) ?? []
      ).map((message) => ({
        id: message.id,
        senderType: message.sender_client_id
          ? ("client" as const)
          : ("therapist" as const),
        body: hasEncryptionConfig
          ? decryptMessageBody(message.body_encrypted)
          : message.body_preview ??
            "Message body unavailable until encryption is configured.",
        sentAt: message.sent_at,
        readAt: message.read_at,
      }));

      return {
        id: thread.id,
        subject: thread.subject,
        lastMessageAt: thread.last_message_at,
        createdAt: thread.created_at,
        clientName: client?.name ?? "Unknown client",
        clientEmail: client?.email ?? null,
        messages: threadMessages,
      };
    },
  );

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    threads: threadViewModels,
    hasEncryptionConfig,
  };
}

function SummaryCards({
  practice,
  threads,
}: {
  practice: PracticeContext;
  threads: ThreadViewModel[];
}) {
  const therapistMessages = threads.flatMap((thread) =>
    thread.messages.filter((message) => message.senderType === "therapist"),
  );
  const clientReplies = threads.flatMap((thread) =>
    thread.messages.filter((message) => message.senderType === "client"),
  );

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.8rem] border border-emerald-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(10,91,72,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Practice</p>
          <HeartHandshake className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-[1.8rem] border border-sky-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Secure threads</p>
          <MessageSquareHeart className="h-5 w-5 text-sky-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">{threads.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Therapist messages: {therapistMessages.length}
        </p>
      </article>
      <article className="rounded-[1.8rem] border border-cyan-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(8,145,178,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Client replies</p>
          <UserRound className="h-5 w-5 text-cyan-700" />
        </div>
        <h2 className="mt-3 text-4xl font-semibold text-slate-950">{clientReplies.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Logged inbound responses across all threads
        </p>
      </article>
    </section>
  );
}

export default async function MessagesPage() {
  const { practice, clients, threads, hasEncryptionConfig } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before opening secure messages
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Secure messaging is practice-scoped and protected by RLS. Set up the
            workspace first, then come back here.
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
            Add a client before opening a secure thread
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Messaging threads are linked to client records. Create at least one
            client first, then come back to record protected communication.
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

  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`.trim(),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-teal-200/70 bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.85),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.96))] p-8 shadow-[0_30px_80px_rgba(13,148,136,0.12)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-teal-800/70">
              Protected care communication
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Messages
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Keep sensitive client communication inside {practice.name} with
              encrypted message storage, thread-based care conversations, and a
              healthcare-focused communication log rather than generic chat.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-teal-200 bg-white/85 px-4 py-2">
                AES-encrypted storage
              </span>
              <span className="rounded-full border border-sky-200 bg-white/85 px-4 py-2">
                Client-linked threads
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/85 px-4 py-2">
                Clinical communication log
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700"
            >
              Back to dashboard
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700"
            >
              Open clients
            </Link>
          </div>
        </div>
      </header>

      {!hasEncryptionConfig ? (
        <section className="rounded-[1.9rem] border border-amber-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(180,83,9,0.08)]">
          <div className="flex items-start gap-4">
            <LockKeyhole className="mt-1 h-5 w-5 text-amber-700" />
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-800/80">
                Configuration required
              </p>
              <p className="text-sm leading-7 text-slate-600">
                Add `MESSAGE_ENCRYPTION_KEY` before creating or reading secure
                messages. The UI is available now, but encrypted message storage
                is intentionally blocked until the key is configured.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <SummaryCards practice={practice} threads={threads} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-teal-200/70 bg-white/92 p-8 shadow-[0_24px_70px_rgba(13,148,136,0.08)]">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-800/70">
              New secure thread
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              Open a conversation
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Start a client-linked thread for scheduling follow-up, care plan
              clarification, or protected practice communication.
            </p>
          </div>
          <div className="mt-6">
            <MessageThreadForm clientOptions={clientOptions} />
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.96))] p-8 shadow-[0_24px_70px_rgba(14,116,144,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-800/70">
              Workflow guidance
            </p>
            <ShieldCheck className="h-5 w-5 text-sky-700" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            Messaging model
          </h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <MailPlus className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium text-slate-900">Outbound notes</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Therapist-authored messages are encrypted before they are written
                to the database.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-teal-200 bg-white/90 p-4">
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4 text-teal-700" />
                <p className="text-sm font-medium text-slate-900">Inbound logging</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Use “Client reply” in the composer when staff need to log a reply
                until the future client portal is in place.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Message threads
          </p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Review protected communication history
          </h2>
        </div>

        {threads.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed border-teal-200 bg-white/70 p-8 text-sm text-slate-600">
            No secure threads yet. Open the first conversation above.
          </article>
        ) : (
          threads.map((thread) => (
            <article
              key={thread.id}
              className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-950">
                      {thread.subject?.trim() || `Secure conversation with ${thread.clientName}`}
                    </h3>
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-teal-800">
                      {thread.clientName}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {thread.clientEmail ? `Client email: ${thread.clientEmail}` : "No client email on file"}
                  </p>
                  <p className="text-sm text-slate-600">
                    Last activity: {formatFriendly(thread.lastMessageAt ?? thread.createdAt)}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
                  {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-[1.5rem] border px-5 py-4 ${
                      message.senderType === "client"
                        ? "border-sky-200 bg-sky-50/70"
                        : "border-emerald-200 bg-emerald-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        {message.senderType === "client" ? "Client reply" : "Therapist message"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {formatFriendly(message.sentAt)}
                      </p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {message.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <MessageComposerForm threadId={thread.id} />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
