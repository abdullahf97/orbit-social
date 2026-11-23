"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDeletePost, useToggleLike } from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CommentSheet } from "./comment-sheet";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import type { PostDto } from "@/lib/schemas";

export function PostCard({
  post,
  priority = false,
  canDelete = false,
}: {
  post: PostDto;
  priority?: boolean;
  canDelete?: boolean;
}) {
  const { user } = useSession();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);

  const isMine = user?.id === post.author.id;
  const canRemove = canDelete || isMine;

  function like() {
    if (!user) return;
    if (!post.likedByMe) {
      toggleLike.mutate({ postId: post.id, liked: true });
      setBurst((value) => value + 1);
    } else {
      toggleLike.mutate({ postId: post.id, liked: false });
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLImageElement>) {
    if (event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!post.likedByMe) like();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Orbit", text: post.caption, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // user dismissed the share sheet
    }
  }

  const aspectRatio =
    post.imageWidth && post.imageHeight
      ? `${post.imageWidth} / ${post.imageHeight}`
      : "4 / 5";

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0">
          <Avatar user={post.author} size={38} ring />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            href={`/u/${post.author.username}`}
            className="block truncate text-[14px] font-semibold text-text hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="truncate text-[12px] text-muted">
            @{post.author.username} ·{" "}
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Post options"
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <MoreHorizontal className="size-[18px]" />
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void share();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-text hover:bg-surface-2"
                >
                  <Share2 className="size-3.5" /> Copy link
                </button>
                <Link
                  href={`/p/${post.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-text hover:bg-surface-2"
                >
                  <Send className="size-3.5" /> Open post
                </Link>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" /> Delete post
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      {post.imageUrl ? (
        <div
          className="relative max-h-[72vh] w-full overflow-hidden bg-surface-2"
          style={{ aspectRatio }}
          onDoubleClick={() => {
            if (!post.likedByMe) like();
          }}
        >
          <img
            src={post.imageUrl}
            alt={post.caption || `Photo shared by ${post.author.name}`}
            width={post.imageWidth ?? undefined}
            height={post.imageHeight ?? undefined}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onPointerUp={onPointerUp}
            className="size-full select-none object-cover"
            draggable={false}
          />
          {burst > 0 ? (
            <span
              key={burst}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <Heart className="animate-heart size-24 fill-white text-white drop-shadow-lg" />
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={like}
            aria-pressed={post.likedByMe}
            aria-label={post.likedByMe ? "Unlike post" : "Like post"}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-medium transition-colors",
              post.likedByMe
                ? "text-accent"
                : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Heart
              key={post.likedByMe ? "liked" : "unliked"}
              className={cn(
                "size-[21px] transition-transform group-active:scale-90",
                post.likedByMe ? "animate-pop fill-accent" : "fill-none",
              )}
            />
            <span className="tabular-nums">
              {post.likeCount > 0 ? formatCount(post.likeCount) : "Like"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Open comments"
          >
            <MessageCircle className="size-[20px]" />
            <span className="tabular-nums">
              {post.commentCount > 0 ? formatCount(post.commentCount) : "Comment"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void share()}
            aria-label="Share post"
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Share2 className="size-[19px]" />
          </button>
        </div>

        {post.caption ? (
          <div className="mt-2 text-[13.5px] leading-relaxed text-text">
            <Link
              href={`/u/${post.author.username}`}
              className="mr-1.5 font-semibold hover:underline"
            >
              {post.author.username}
            </Link>
            <span className={cn("whitespace-pre-wrap", !expanded && "line-clamp-3")}>
              {post.caption}
            </span>
            {post.caption.length > 170 ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="ml-1 text-[12.5px] font-medium text-dim hover:text-text"
              >
                {expanded ? "less" : "more"}
              </button>
            ) : null}
          </div>
        ) : null}

        {post.commentCount > 0 ? (
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="mt-2 text-[13px] font-medium text-muted transition-colors hover:text-text"
          >
            View all {post.commentCount}{" "}
            {post.commentCount === 1 ? "comment" : "comments"}
          </button>
        ) : null}
      </div>

      <CommentSheet
        post={post}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this post?"
        description="This removes the photo, comments and likes for everyone. It can't be undone."
      >
        <div className="flex justify-end gap-2 px-5 py-4">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={deletePost.isPending}
            onClick={() => {
              deletePost.mutate(
                { postId: post.id },
                {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    setCommentsOpen(false);
                  },
                },
              );
            }}
          >
            Delete post
          </Button>
        </div>
      </Modal>
    </article>
  );
}
