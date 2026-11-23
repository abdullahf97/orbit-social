"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { formatCount } from "@/lib/utils";
import type { PostDto } from "@/lib/schemas";

export function PostGrid({ posts }: { posts: PostDto[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/p/${post.id}`}
          className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2 focus-visible:outline-offset-2"
        >
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.caption || `Post by ${post.author.name}`}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center p-3 text-[12px] leading-snug text-muted">
              <span className="line-clamp-6">{post.caption}</span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 text-[13px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1.5">
              <Heart className="size-4 fill-white" />
              {formatCount(post.likeCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="size-4 fill-white" />
              {formatCount(post.commentCount)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
