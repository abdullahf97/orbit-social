import Link from "next/link";
import { cn } from "@/lib/utils";

export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <circle cx="20" cy="20" r="7.5" fill="currentColor" opacity="0.95" />
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="7.4"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.55"
        transform="rotate(-28 20 20)"
      />
      <circle cx="33.2" cy="12.6" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  href = "/",
  showWordmark = true,
  className,
}: {
  href?: string;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 text-text transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Orbit home"
    >
      <span className="relative grid size-9 place-items-center rounded-full bg-accent text-accent-ink">
        <OrbitMark className="size-5" />
      </span>
      {showWordmark ? (
        <span className="font-display text-[26px] leading-none tracking-tight">
          Orbit
        </span>
      ) : null}
    </Link>
  );
}
