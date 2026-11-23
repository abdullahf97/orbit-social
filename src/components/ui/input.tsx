import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[15px] text-text",
        "placeholder:text-dim transition-colors",
        "focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[15px] leading-relaxed text-text",
        "placeholder:text-dim transition-colors",
        "focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-muted"
        >
          {label}
        </label>
        {hint ? <span className="text-[12px] text-dim">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
