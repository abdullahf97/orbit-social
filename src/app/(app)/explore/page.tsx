"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import { useFeed, useSearch, useSuggestions } from "@/features/api/hooks";
import { useInView } from "@/lib/use-in-view";
import { PostGrid } from "@/features/feed/post-grid";
import { UserCard } from "@/features/users/user-card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

function ExploreContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const searching = query.trim().length > 0;
  const search = useSearch(query);
  const suggestions = useSuggestions();
  const explore = useFeed("explore");
  const [sentinelRef, inView] = useInView<HTMLDivElement>({
    rootMargin: "600px 0px",
  });

  useEffect(() => {
    if (
      inView &&
      explore.hasNextPage &&
      !explore.isFetchingNextPage &&
      !searching
    ) {
      void explore.fetchNextPage();
    }
  }, [inView, explore, searching]);

  const explorePosts = explore.data?.pages.flatMap((page) => page.items) ?? [];
  const people = suggestions.data?.users ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
          Discover
        </p>
        <h1 className="mt-1 font-display text-[34px] leading-none tracking-tight text-text sm:text-[40px]">
          Explore
        </h1>
      </header>

      <div className="relative" role="search">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-dim" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people, captions, usernames…"
          aria-label="Search Orbit"
          autoComplete="off"
          className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-11 text-[14px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/10"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {searching ? (
        <section className="space-y-6">
          {search.isPending ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-5 text-muted" />
            </div>
          ) : (
            <>
              <div>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                  People
                </h2>
                {search.data?.users.length ? (
                  <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
                    {search.data.users.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">No people matched.</p>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                  Posts
                </h2>
                {search.data?.posts.length ? (
                  <PostGrid posts={search.data.posts} />
                ) : (
                  <p className="text-[13px] text-muted">No posts matched.</p>
                )}
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          {people.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                  People to orbit
                </h2>
                <span className="text-[11px] text-dim">
                  <Sparkles className="mr-1 inline size-3" />
                  suggestions
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {people.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-line bg-surface p-3"
                  >
                    <UserCard user={user} isFollowing={false} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
              From everywhere
            </h2>
            {explore.isPending ? (
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                {Array.from({ length: 9 }, (_, index) => (
                  <Skeleton key={index} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : explorePosts.length === 0 ? (
              <EmptyState
                title="The explore grid is empty"
                description="Once people post photos, they'll show up here."
              />
            ) : (
              <>
                <PostGrid posts={explorePosts} />
                <div ref={sentinelRef} className="h-px" />
                {explore.isFetchingNextPage ? (
                  <div className="flex justify-center py-5">
                    <Spinner className="size-5 text-muted" />
                  </div>
                ) : null}
                {explore.hasNextPage ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void explore.fetchNextPage()}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="size-5 text-muted" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
