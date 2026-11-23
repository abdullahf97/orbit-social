"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useSuggestions } from "@/features/api/hooks";
import { UserCard } from "@/features/users/user-card";
import { Skeleton } from "@/components/ui/feedback";
import { GithubIcon } from "@/components/ui/github-icon";

export function RightRail() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const suggestions = useSuggestions();

  const users = suggestions.data?.users ?? [];

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          if (trimmed) router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
        }}
        className="relative"
        role="search"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people and posts"
          aria-label="Search"
          className="h-10 w-full rounded-full border border-line bg-surface-2 pl-10 pr-4 text-[13px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/10"
        />
      </form>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Suggested for you
        </h2>
        <div className="mt-3 space-y-3">
          {suggestions.isPending ? (
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-[42px] rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted">
              You’re following everyone here. Bring more people into orbit.
            </p>
          ) : (
            users.map((user) => (
              <UserCard key={user.id} user={user} isFollowing={false} compact />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-[19px] leading-tight text-text">
          Built in public
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          An offline-first social feed: cursor pagination, optimistic likes and
          comments, an IndexedDB cache and a mutation outbox that survives a
          reload.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Next.js", "PostgreSQL", "TanStack Query", "IndexedDB", "TypeScript"].map(
            (tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted"
              >
                {tag}
              </span>
            ),
          )}
        </div>
        <a
          href="https://github.com/abdullahf97/orbit-social"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text transition-colors hover:text-accent"
        >
          <GithubIcon className="size-3.5" />
          Source on GitHub
          <ArrowUpRight className="size-3" />
        </a>
      </section>

      <div className="space-y-1 px-2 text-[11px] leading-relaxed text-dim">
        <p>
          <Link href="/settings" className="hover:text-muted">
            Settings
          </Link>
          {" · "}
          <Link href="/about" className="hover:text-muted">
            About
          </Link>
        </p>
        <p>© 2026 Orbit · built by Abdullah Farooq</p>
      </div>
    </div>
  );
}
