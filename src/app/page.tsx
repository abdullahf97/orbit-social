import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Database,
  Heart,
  ImagePlus,
  Infinity as InfinityIcon,
  ShieldCheck,
  WifiOff,
  Zap,
} from "lucide-react";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DemoLoginButton } from "@/features/auth/demo-login-button";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/github-icon";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant validation",
    body: "Debounced username checks, inline field errors and a password strength meter — before you ever hit submit.",
  },
  {
    icon: InfinityIcon,
    title: "Infinite feed",
    body: "Keyset pagination on (createdAt, id) so scrolling never duplicates a post or slows down.",
  },
  {
    icon: Heart,
    title: "Optimistic interactions",
    body: "Likes, follows and comments land instantly, with rollback if the server disagrees.",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    body: "Feed pages persist in IndexedDB. Actions taken offline queue up and replay on reconnect.",
  },
  {
    icon: Bell,
    title: "Unread counters",
    body: "Notifications are polled quietly, with per-item and mark-all-read state.",
  },
  {
    icon: ImagePlus,
    title: "Real uploads",
    body: "Images are resized in the browser, re-encoded with sharp and stored in Vercel Blob.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  const posts = await db.post.findMany({
    where: { imageUrl: { not: null } },
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      author: { select: { name: true, username: true } },
    },
  });

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_at_top,rgba(255,107,74,0.12),transparent_60%)]"
      />

      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/about"
              className="hidden rounded-full px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-text sm:block"
            >
              How it’s built
            </Link>
            <a
              href="https://github.com/abdullahf97/orbit-social"
              target="_blank"
              rel="noreferrer"
              aria-label="Source on GitHub"
              className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <GithubIcon className="size-[18px]" />
            </a>
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup" className="hidden sm:block">
              <Button size="sm">Join</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5">
        <section className="grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.03fr_0.97fr] lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Offline-first · built in public
            </span>

            <h1 className="mt-5 font-display text-[52px] leading-[0.98] tracking-[-0.02em] text-text sm:text-[68px]">
              A{" "}
              <span className="relative inline-block text-accent">
                quieter
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 12"
                  className="absolute -bottom-1 left-0 w-full text-accent/40"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8c40-5 90-7 196-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              place to share what you’re making.
            </h1>

            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-muted">
              Orbit is a small social app for photos, notes and the people you
              actually follow. No algorithm, no autoplay, no noise — and it keeps
              working when your connection doesn’t.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <DemoLoginButton />
              <Link href="/signup">
                <Button size="lg" variant="outline">
                  Create an account
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-[12px] text-dim">
              Demo account:{" "}
              <span className="text-muted">nova@orbit.app</span> ·{" "}
              <span className="text-muted">orbitdemo</span> — preloaded with 8
              people, 20 posts and notifications.
            </p>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ["8", "people"],
                ["20", "posts"],
                ["0", "algorithms"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="font-display text-[28px] leading-none text-text">
                      {value}
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-dim">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="relative h-[440px] sm:h-[520px]">
              {posts.map((post, index) => {
                const rotations = ["-rotate-6", "rotate-3", "-rotate-2"];
                const offsets = [
                  "left-0 top-6",
                  "right-0 top-0",
                  "left-[18%] bottom-0",
                ];
                return (
                  <figure
                    key={post.id}
                    className={`absolute w-[62%] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40 transition-transform duration-500 hover:!rotate-0 hover:scale-[1.02] ${rotations[index]} ${offsets[index]}`}
                  >
                    <img
                      src={post.imageUrl ?? ""}
                      alt={post.caption ?? ""}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <span className="truncate text-[11px] text-muted">
                        @{post.author.username}
                      </span>
                      <Heart className="size-3.5 text-accent" />
                    </figcaption>
                  </figure>
                );
              })}

              <div className="absolute -bottom-2 right-2 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-[11.5px] font-medium text-text shadow-xl">
                <span className="grid size-5 place-items-center rounded-full bg-accent/15 text-accent">
                  <WifiOff className="size-3" />
                </span>
                Cached offline · syncing when back
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line py-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
                What’s inside
              </p>
              <h2 className="mt-2 font-display text-[36px] leading-none tracking-tight text-text">
                Small app. Real engineering.
              </h2>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-muted">
              Every feature is built the way it would be in production: validated,
              paginated, indexed and tested.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-accent">
                    <Icon className="size-[18px]" />
                  </span>
                  <h3 className="mt-3.5 text-[14.5px] font-semibold text-text">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-10 border-t border-line py-16 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
              Under the hood
            </p>
            <h2 className="mt-2 font-display text-[36px] leading-none tracking-tight text-text">
              The interesting parts
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                {
                  icon: Database,
                  title: "Denormalised counters",
                  body: "likeCount, commentCount and follower counts are maintained inside the same transaction as the write, so feeds never COUNT(*).",
                },
                {
                  icon: ShieldCheck,
                  title: "Sessions, not JWTs",
                  body: "Opaque 256-bit tokens stored as SHA-256 hashes. Revocable, no refresh dance, no secret leaking into the client.",
                },
                {
                  icon: WifiOff,
                  title: "A mutation outbox",
                  body: "Offline actions pause in TanStack Query's persisted mutation cache. Idempotent endpoints make replays safe.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-text">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                        {item.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-[#0d0d12]">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[11px] text-dim">feed.ts · keyset pagination</span>
            </div>
            <pre className="overflow-x-auto p-4 text-[11.5px] leading-relaxed text-[#c9c9d4]">
              <code>{`const rows = await db.post.findMany({
  where: {
    author: {
      OR: [
        { id: viewer.id },
        { followers: { some: { followerId: viewer.id } } },
      ],
    },
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: limit + 1,
});`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-20 overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/[0.08] blur-2xl"
            />
            <div>
              <h2 className="font-display text-[34px] leading-tight tracking-tight text-text">
                Come see the whole thing.
              </h2>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
                The demo is a real account in a seeded database. Post something,
                like a few things, then turn your wifi off.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <DemoLoginButton />
              <Link href="/about">
                <Button size="lg" variant="ghost">
                  Read the architecture
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[12px] text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Orbit · built by Abdullah Farooq</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-muted">
              Architecture
            </Link>
            <a
              href="https://github.com/abdullahf97/orbit-social"
              target="_blank"
              rel="noreferrer"
              className="hover:text-muted"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/abdullah-farooq-143952177/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-muted"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
