import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthPanelProps = {
  title: string;
  description: string;
  eyebrow: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  children: ReactNode;
  className?: string;
};

export function AuthPanel({
  title,
  description,
  eyebrow,
  alternateHref,
  alternateLabel,
  alternateText,
  children,
  className,
}: AuthPanelProps) {
  return (
    <section
      className={cn(
        "w-full max-w-md rounded-[2rem] border bg-card/90 p-8 shadow-sm",
        className,
      )}
    >
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-8">{children}</div>

      <p className="mt-6 text-sm text-muted-foreground">
        {alternateText}{" "}
        <Link href={alternateHref} className="font-medium text-primary">
          {alternateLabel}
        </Link>
      </p>
    </section>
  );
}

