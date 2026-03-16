import Link from "next/link";
import { redirect } from "next/navigation";

import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentMetadataForm } from "@/components/documents/document-metadata-form";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import {
  getCurrentPracticeContext,
  type PracticeContext,
} from "@/lib/supabase/practice-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Documents | TherapyFlow",
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type DocumentRow = {
  id: string;
  client_id: string;
  title: string;
  document_type: "consent_form" | "intake_form" | "assessment" | "report" | "other";
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  is_client_visible: boolean;
  created_at: string;
};

function formatFileSize(value: number | null) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function titleCaseDocumentType(value: DocumentRow["document_type"]) {
  return value.replace(/_/g, " ");
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
      documents: [] as DocumentRow[],
    };
  }

  const [{ data: clients, error: clientsError }, { data: documents, error: documentsError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("practice_id", practice.id)
        .order("first_name", { ascending: true }),
      supabase
        .from("documents")
        .select(
          "id, client_id, title, document_type, storage_bucket, storage_path, mime_type, file_size_bytes, is_client_visible, created_at",
        )
        .eq("practice_id", practice.id)
        .order("created_at", { ascending: false }),
    ]);

  if (clientsError) {
    throw clientsError;
  }

  if (documentsError) {
    throw documentsError;
  }

  return {
    practice,
    clients: (clients ?? []) as ClientRow[],
    documents: (documents ?? []) as DocumentRow[],
  };
}

function SummaryCards({
  practice,
  documents,
}: {
  practice: PracticeContext;
  documents: DocumentRow[];
}) {
  const visibleDocs = documents.filter((document) => document.is_client_visible);
  const reports = documents.filter((document) => document.document_type === "report");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Practice</p>
        <h2 className="mt-3 text-xl font-semibold">{practice.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Role: {practice.role}</p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Documents</p>
        <h2 className="mt-3 text-3xl font-semibold">{documents.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Client-visible: {visibleDocs.length}
        </p>
      </article>
      <article className="rounded-3xl border bg-card/90 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Reports</p>
        <h2 className="mt-3 text-3xl font-semibold">{reports.length}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Assessments and reports stored securely
        </p>
      </article>
    </section>
  );
}

export default async function DocumentsPage() {
  const { practice, clients, documents } = await getPageData();

  if (!practice) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace required
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Create your practice before uploading documents
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Documents are protected by practice-scoped access rules and storage
            policies. Start by setting up the workspace on the dashboard.
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
            Add a client before uploading documents
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Every document is attached to a client record. Create at least one
            client first, then come back to upload forms, reports, and assessments.
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

  const clientMap = new Map(
    clients.map((client) => [client.id, `${client.first_name} ${client.last_name}`]),
  );
  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Document management
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
            Documents
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload, store, organize, and retrieve client forms, assessments, and
            reports for {practice.name}.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          Back to dashboard
        </Link>
      </header>

      <SummaryCards practice={practice} documents={documents} />

      <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New upload
          </p>
          <h2 className="text-2xl font-semibold">Upload a client document</h2>
        </div>
        <div className="mt-6">
          <DocumentUploadForm
            practiceId={practice.id}
            clientOptions={clientOptions}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Stored files
          </p>
          <h2 className="text-2xl font-semibold">Manage uploaded documents</h2>
        </div>

        {documents.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed bg-card/70 p-8 text-sm text-muted-foreground">
            No documents yet. Upload the first client file above.
          </article>
        ) : (
          documents.map((document) => (
            <article
              key={document.id}
              className="rounded-[2rem] border bg-card/90 p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{document.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {clientMap.get(document.client_id) ?? "Unknown client"} •{" "}
                    {titleCaseDocumentType(document.document_type)} •{" "}
                    {formatFileSize(document.file_size_bytes)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Client visible: {document.is_client_visible ? "Yes" : "No"}
                  </p>
                </div>
                <DocumentActions
                  documentId={document.id}
                  documentTitle={document.title}
                  storageBucket={document.storage_bucket}
                  storagePath={document.storage_path}
                />
              </div>
              <div className="mt-6">
                <DocumentMetadataForm
                  clientOptions={clientOptions}
                  initialValues={{
                    id: document.id,
                    clientId: document.client_id,
                    title: document.title,
                    documentType: document.document_type,
                    isClientVisible: document.is_client_visible,
                  }}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
