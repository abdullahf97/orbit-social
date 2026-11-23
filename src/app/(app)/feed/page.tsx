"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagePlus, Sparkles } from "lucide-react";
import { useSession } from "@/features/auth/session";
import { FeedList } from "@/features/feed/feed-list";
import { openComposer } from "@/features/posts/composer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "following" | "explore";

export default function FeedPage() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("following");

  if (!user) return null;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
            Home
          </p>
          <h1 className="mt-1 font-display text-[34px] leading-none tracking-tight text-text sm:text-[40px]">
            Your orbit
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Feed source"
          className="flex rounded-full border border-line bg-surface p-1"
        >
          {(
            [
              ["following", "Following"],
              ["explore", "Everyone"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                mode === value
                  ? "bg-surface-2 text-text shadow-sm"
                  : "text-muted hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
        <Avatar user={user} size={38} ring />
        <button
          type="button"
          onClick={openComposer}
          className="h-10 flex-1 rounded-full border border-line bg-surface-2 px-4 text-left text-[13.5px] text-dim transition-colors hover:border-line-strong hover:text-muted"
        >
          Share something with your orbit…
        </button>
        <Button variant="secondary" size="sm" onClick={openComposer}>
          <ImagePlus className="size-4" />
          <span className="hidden sm:inline">Photo</span>
        </Button>
      </section>

      <FeedList
        mode={mode}
        emptyTitle={
          mode === "following"
            ? "Your orbit is quiet"
            : "Nothing here yet"
        }
        emptyDescription={
          mode === "following"
            ? "Follow a few people and their moments will show up here."
            : "Be the first to post something."
        }
        emptyAction={
          mode === "following" ? (
            <Link href="/explore">
              <Button size="sm" variant="outline">
                <Sparkles className="size-3.5" />
                Find people
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={openComposer}>
              Create the first post
            </Button>
          )
        }
      />
    </div>
  );
}
