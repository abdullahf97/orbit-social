"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { CommentThread } from "./comment-thread";
import type { PostDto } from "@/lib/schemas";

export function CommentSheet({
  post,
  open,
  onClose,
}: {
  post: PostDto;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comments"
      description={`${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`}
      className="sm:max-w-xl"
    >
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/40 px-5 py-3">
        <Link href={`/u/${post.author.username}`} onClick={onClose}>
          <Avatar user={post.author} size={34} />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/u/${post.author.username}`}
            onClick={onClose}
            className="text-[13.5px] font-semibold hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="truncate text-[12px] text-muted">
            {post.caption || "Shared a photo"}
          </p>
        </div>
      </div>
      <CommentThread post={post} compact />
    </Modal>
  );
}
