"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { usePost } from "@/features/api/hooks";
import { PostCard } from "@/features/posts/post-card";
import { CommentThread } from "@/features/posts/comment-thread";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id ?? "";
  const post = usePost(postId);

  if (post.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
        </div>
      </div>
    );
  }

  if (post.isError || !post.data) {
    return (
      <EmptyState
        icon={<MessageCircle className="size-5" />}
        title="Post not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Link href="/feed">
            <Button size="sm" variant="outline">
              Back to feed
            </Button>
          </Link>
        }
      />
    );
  }

  const item = post.data.post;

  return (
    <div className="space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="size-4" />
        Back to feed
      </Link>

      <PostCard post={item} priority />

      <section className="overflow-hidden rounded-3xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3 font-display text-[21px] text-text">
          Comments
        </h2>
        <CommentThread post={item} canModerate />
      </section>
    </div>
  );
}
