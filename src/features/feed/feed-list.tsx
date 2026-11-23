"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useFeed, useOnline } from "@/features/api/hooks";
import { useInView } from "@/lib/use-in-view";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Spinner } from "@/components/ui/spinner";
import { PostCard } from "@/features/posts/post-card";
import type { FeedMode } from "@/features/api/query-keys";

function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="size-[38px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function FeedList({
  mode,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  mode: FeedMode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const feed = useFeed(mode);
  const online = useOnline();
  const [sentinelRef, inView] = useInView<HTMLDivElement>({
    rootMargin: "600px 0px",
  });

  useEffect(() => {
    if (
      inView &&
      feed.hasNextPage &&
      !feed.isFetchingNextPage &&
      !feed.isFetching
    ) {
      void feed.fetchNextPage();
    }
  }, [inView, feed]);

  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

  if (feed.isPending) {
    return (
      <div className="space-y-4">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (feed.isError && posts.length === 0) {
    return (
      <EmptyState
        icon={<RefreshCw className="size-5" />}
        title="Couldn't load your feed"
        description={
          online
            ? "Something went wrong on the way here. Try again."
            : "You're offline and there's nothing cached yet."
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void feed.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<span className="font-display text-2xl">✦</span>}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <PostCard key={post.id} post={post} priority={index < 2} />
      ))}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      {feed.isFetchingNextPage ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-5 text-muted" />
        </div>
      ) : null}

      {!feed.hasNextPage ? (
        <p className="py-8 text-center text-[12.5px] text-dim">
          You’ve reached the edge of your orbit.
        </p>
      ) : null}
    </div>
  );
}
