"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useOnline,
} from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn, createClientId, timeAgo } from "@/lib/utils";
import type { CommentDto, PostDto } from "@/lib/schemas";

function CommentRow({
  comment,
  parent,
  canDelete,
  onReply,
  onDelete,
  deleting,
}: {
  comment: CommentDto;
  parent: CommentDto | undefined;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <li className="group flex gap-2.5 py-3">
      <Link href={`/u/${comment.author.username}`} className="shrink-0">
        <Avatar user={comment.author} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-relaxed text-text">
          <Link
            href={`/u/${comment.author.username}`}
            className="mr-1.5 font-semibold hover:underline"
          >
            {comment.author.username}
          </Link>
          {parent ? (
            <Link
              href={`/u/${parent.author.username}`}
              className="mr-1 text-accent/90 hover:underline"
            >
              @{parent.author.username}
            </Link>
          ) : null}
          <span className="whitespace-pre-wrap break-words">{comment.body}</span>
        </p>
        <div className="mt-1 flex items-center gap-3 text-[11.5px] text-dim">
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          <button
            type="button"
            onClick={onReply}
            className="font-medium transition-colors hover:text-text"
          >
            Reply
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-40"
              aria-label="Delete comment"
            >
              <Trash2 className="size-3" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CommentThread({
  post,
  canModerate = false,
  compact = false,
}: {
  post: PostDto;
  canModerate?: boolean;
  compact?: boolean;
}) {
  const { user } = useSession();
  const online = useOnline();
  const comments = useComments(post.id);
  const addComment = useAddComment(post.id);
  const deleteComment = useDeleteComment(post.id);

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const items = useMemo(
    () => comments.data?.pages.flatMap((page) => page.items) ?? [],
    [comments.data],
  );

  useEffect(() => {
    if (!compact) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, compact]);

  // Offline, a paused mutation stays pending forever, so don't let that gate
  // the input — otherwise only one comment could ever be queued per post.
  const canSubmit =
    body.trim().length > 0 &&
    Boolean(user) &&
    (!addComment.isPending || !online);

  function submit() {
    if (!user || !canSubmit) return;
    const text = body.trim();
    setBody("");
    setReplyTo(null);

    addComment.mutate({
      postId: post.id,
      body: text,
      parentId: replyTo?.id ?? null,
      clientId: createClientId(),
      author: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });

    if (!online) {
      toast("Queued — this comment sends when you're back online.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-5",
          compact ? "max-h-[46dvh]" : "max-h-[560px]",
        )}
      >
        {comments.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-5 text-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageCircle className="size-6 text-dim" />
            <p className="text-sm font-medium text-text">No comments yet</p>
            <p className="text-[13px] text-muted">Be the first to say something.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {items.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                parent={items.find((item) => item.id === comment.parentId)}
                canDelete={
                  comment.isMine || canModerate || post.author.id === user?.id
                }
                onReply={() => {
                  setReplyTo(comment);
                  inputRef.current?.focus();
                }}
                onDelete={() =>
                  deleteComment.mutate({ commentId: comment.id, postId: post.id })
                }
                deleting={deleteComment.isPending}
              />
            ))}
          </ul>
        )}

        {comments.hasNextPage ? (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={() => void comments.fetchNextPage()}
              disabled={comments.isFetchingNextPage}
              className="text-[13px] font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
            >
              {comments.isFetchingNextPage ? "Loading…" : "Load more comments"}
            </button>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="border-t border-line bg-surface px-4 py-3">
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-[12px] text-muted">
            <span className="truncate">
              Replying to{" "}
              <span className="font-medium text-text">@{replyTo.author.username}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              className="text-dim hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {user ? <Avatar user={user} size={32} /> : null}
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={online ? "Add a comment…" : "Comment (queued offline)…"}
              aria-label="Add a comment"
              className="max-h-28 min-h-10 w-full resize-none rounded-2xl border border-line bg-surface-2 py-2.5 pl-3.5 pr-11 text-[13.5px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Post comment"
              className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-30"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-1.5 pl-10 text-[11px] text-dim">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
