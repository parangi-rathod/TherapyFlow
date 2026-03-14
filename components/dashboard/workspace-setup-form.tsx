"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createPracticeAction } from "@/app/actions/practice";
import {
  CreatePracticeSchema,
  type CreatePracticeSchemaInput,
} from "@/lib/validations/practice";

type WorkspaceSetupFormProps = {
  suggestedName: string;
  suggestedSlug: string;
};

export function WorkspaceSetupForm({
  suggestedName,
  suggestedSlug,
}: WorkspaceSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<CreatePracticeSchemaInput>({
    resolver: zodResolver(CreatePracticeSchema),
    defaultValues: {
      name: suggestedName,
      slug: suggestedSlug,
    },
  });

  const slugPreview = form.watch("slug");

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createPracticeAction(values);

      if (!result.success) {
        setErrorMessage(result.error ?? "Unable to create the workspace.");
        return;
      }

      router.push("/dashboard/clients");
      router.refresh();
    });
  });

  return (
    <section className="grid gap-8 rounded-[2rem] border bg-card/90 p-8 shadow-sm md:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Workspace setup
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
          Create your practice workspace
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Every client, appointment, note, invoice, and message belongs to a
          practice. Create the first workspace once, and the rest of the app can
          operate against that context.
        </p>
        <div className="rounded-3xl border bg-background/70 p-5">
          <p className="text-sm text-muted-foreground">Public workspace slug</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            therapyflow.app/{slugPreview || "your-practice"}
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="workspace-name">
            Practice name
          </label>
          <input
            id="workspace-name"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="workspace-slug">
            Workspace slug
          </label>
          <input
            id="workspace-slug"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm lowercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            {...form.register("slug")}
          />
          {form.formState.errors.slug ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.slug.message}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
