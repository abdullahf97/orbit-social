import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Database, Layers, ShieldCheck, WifiOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GithubIcon } from "@/components/ui/github-icon";

export const metadata: Metadata = {
  title: "How Orbit is built",
  description:
    "Architecture notes for Orbit: Next.js App Router, PostgreSQL, Prisma, cursor pagination, optimistic mutations and an offline-first client.",
};

const STACK = [
  ["Framework", "Next.js 16 · App Router · React 19 · TypeScript strict"],
  ["Data", "PostgreSQL 17 · Prisma 7 · node-postgres driver adapter"],
  ["Client state", "TanStack Query 5 · IndexedDB (idb) · optimistic updates"],
  ["Styling", "Tailwind CSS v4 · custom design tokens · dark-first"],
  ["Media", "sharp (WebP resize) · local disk in dev · Vercel Blob in prod"],
  ["Testing", "Vitest (unit) · Playwright (E2E) · GitHub Actions"],
];

const DECISIONS = [
  {
    title: "Opaque sessions over JWTs",
    body: "A 256-bit random token is set as an httpOnly cookie; only its SHA-256 hash is stored. Revocation is a delete, there is no refresh-token dance, and a database leak cannot be replayed.",
  },
  {
    title: "Keyset pagination, not OFFSET",
    body: "Every feed page is ordered by (createdAt DESC, id DESC) and filtered by the last row's cursor. Stable while people post, and the index does the work instead of the database counting skipped rows.",
  },
  {
    title: "Denormalised counters",
    body: "likeCount, commentCount, followerCount and postCount are updated in the same transaction as the write. Feeds never run COUNT(*), and the UI can trust a single row.",
  },
  {
    title: "Idempotent writes",
    body: "Likes and follows rely on unique constraints plus skipDuplicates. Comments and posts accept client-generated ids. Replaying a queued offline action is therefore safe.",
  },
  {
    title: "Polling for notifications",
    body: "Vercel's serverless runtime has no long-lived connections or cross-instance pub/sub without extra infrastructure. A 20-second poll keeps the badge honest; the tradeoff is documented rather than hidden.",
  },
  {
    title: "IndexedDB as a real cache",
    body: "TanStack Query's persister stores successful queries and paused mutations. A service worker caches the app shell and images, so a cold reload offline still boots with your feed.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-text transition-colors hover:border-line-strong"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
          Architecture
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-[44px] leading-[1.02] tracking-tight text-text sm:text-[56px]">
          A small app, built like it has users.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          Orbit is a portfolio project by Abdullah Farooq. The brief was simple:
          build an Instagram-shaped app without pretending the hard parts away.
          Everything below is implemented, not planned.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {STACK.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">
                {label}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text">{value}</p>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="font-display text-[30px] leading-none tracking-tight text-text">
            Request flow
          </h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-[#0d0d12] p-5">
            <pre className="text-[11.5px] leading-relaxed text-[#c9c9d4]">
              <code>{`Browser (React 19)
  ├─ TanStack Query cache ──persist──▶ IndexedDB
  │     └─ paused mutations ──replay──┐
  │                                   │
  └─ fetch /api/* ──▶ Next.js route handler (Node)
                        ├─ Zod parse + same-origin check
                        ├─ rate limit (in-memory, per instance)
                        ├─ session cookie → SHA-256 → Session row
                        ├─ Prisma transaction
                        │    ├─ write row
                        │    ├─ update denormalised counters
                        │    └─ insert notification (never self)
                        └─ DTO serializer (no password hashes, no emails)

PostgreSQL 17
  ├─ keyset indexes: (createdAt, id), (postId, createdAt)
  ├─ unique: (postId, userId) likes, (followerId, followingId) follows
  └─ cascading deletes for post → likes/comments/notifications`}</code>
            </pre>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[30px] leading-none tracking-tight text-text">
            Decisions worth defending
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {DECISIONS.map((decision) => (
              <article
                key={decision.title}
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <h3 className="text-[13.5px] font-semibold text-text">
                  {decision.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                  {decision.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Database,
              title: "Schema",
              body: "7 tables, 1 enum, 17 indexes. Counters and indexes are chosen for the feed queries that actually run.",
            },
            {
              icon: ShieldCheck,
              title: "Security",
              body: "scrypt hashes, httpOnly SameSite=Lax cookies, same-origin mutation checks, Zod validation, per-IP and per-user rate limits.",
            },
            {
              icon: WifiOff,
              title: "Offline",
              body: "Service worker app shell, IndexedDB query cache, paused-mutation outbox, and an honest offline banner.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-line bg-surface p-4">
                <Icon className="size-4 text-accent" />
                <h3 className="mt-2.5 text-[13.5px] font-semibold text-text">
                  {item.title}
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-14 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <Layers className="size-5 text-accent" />
          <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-text">
            Known limits
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted">
            <li>
              <span className="text-text">Rate limits are per instance.</span>{" "}
              In-memory buckets reset on cold starts and are not shared across
              Vercel functions. A production system would use Upstash Redis.
            </li>
            <li>
              <span className="text-text">Notifications poll.</span> A WebSocket
              or SSE layer needs a stateful host or a managed pub/sub service.
            </li>
            <li>
              <span className="text-text">Single-region database.</span> Neon in
              one region keeps latency predictable; multi-region reads are out of
              scope.
            </li>
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="https://github.com/abdullahf97/orbit-social"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            <GithubIcon className="size-4" />
            Read the source
            <ArrowUpRight className="size-3.5" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-2"
          >
            Back to Orbit
          </Link>
        </div>
      </main>
    </div>
  );
}
