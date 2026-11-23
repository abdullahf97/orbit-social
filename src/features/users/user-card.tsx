"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import { cn, formatCount } from "@/lib/utils";
import type { PublicUser } from "@/lib/schemas";

export function UserCard({
  user,
  isFollowing,
  followsMe = false,
  compact = false,
  className,
}: {
  user: PublicUser;
  isFollowing?: boolean;
  followsMe?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link href={`/u/${user.username}`} className="shrink-0">
        <Avatar user={user} size={compact ? 34 : 42} />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <Link
          href={`/u/${user.username}`}
          className="block truncate text-[13.5px] font-semibold text-text hover:underline"
        >
          {user.name}
        </Link>
        <p className="truncate text-[12px] text-muted">
          @{user.username}
          {!compact && user.followerCount > 0
            ? ` · ${formatCount(user.followerCount)} followers`
            : ""}
        </p>
        {!compact && followsMe ? (
          <p className="mt-0.5 text-[11px] text-dim">Follows you</p>
        ) : null}
      </div>
      {typeof isFollowing === "boolean" ? (
        <FollowButton
          username={user.username}
          isFollowing={isFollowing}
          followsMe={followsMe}
          size="sm"
        />
      ) : null}
    </div>
  );
}
