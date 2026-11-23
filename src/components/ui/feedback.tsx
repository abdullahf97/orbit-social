import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer rounded-lg bg-surface-2", className)}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <h2 className="text-[17px] font-semibold text-text">{title}</h2>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
