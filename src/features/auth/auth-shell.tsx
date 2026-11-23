import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-bg-elev p-10 lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-1/2 size-[620px] -translate-y-1/2 opacity-70"
        >
          <div className="absolute inset-0 rounded-full border border-line" />
          <div className="absolute inset-[10%] rounded-full border border-line" />
          <div className="absolute inset-[21%] rounded-full border border-line" />
          <div className="absolute inset-[33%] rounded-full bg-accent/[0.06]" />
          <div className="absolute inset-[40%] rounded-full border border-accent/25" />
          <div className="animate-spin-slow absolute inset-0">
            <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_24px_var(--accent)]" />
          </div>
          <div
            className="animate-spin-slow absolute inset-[21%]"
            style={{ animationDirection: "reverse", animationDuration: "14s" }}
          >
            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-accent/70" />
          </div>
        </div>

        <div className="relative">
          <Logo />
        </div>

        <div className="relative mt-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            A quieter social network
          </p>
          <h2 className="mt-3 font-display text-[44px] leading-[1.05] tracking-tight text-text">
            Your people.
            <br />
            Your moments.
            <br />
            <span className="text-accent">Even offline.</span>
          </h2>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted">
            Orbit keeps a copy of your feed in IndexedDB, queues what you do on a
            flaky connection, and sends it the moment you’re back.
          </p>

          <ul className="mt-8 space-y-2.5 text-[13px] text-muted">
            {[
              "Optimistic likes and comments that never wait",
              "Infinite feed with cursor pagination",
              "Photo uploads, resized server-side",
              "Unread notifications, quietly polled",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 text-[11px] text-dim">
          Built by Abdullah Farooq · Next.js · PostgreSQL
        </p>
      </aside>

      <main className="flex flex-col">
        <header className="flex items-center justify-between p-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-[390px]">
            <h1 className="font-display text-[40px] leading-none tracking-tight text-text">
              {title}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {subtitle}
            </p>
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
