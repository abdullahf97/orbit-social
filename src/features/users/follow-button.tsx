"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useFollow } from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowButton({
  username,
  isFollowing,
  followsMe = false,
  size = "md",
  className,
}: {
  username: string;
  isFollowing: boolean;
  followsMe?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const follow = useFollow();
  const { user } = useSession();
  const [hovering, setHovering] = useState(false);

  if (user?.username === username) return null;

  const label = isFollowing
    ? hovering
      ? "Unfollow"
      : "Following"
    : followsMe
      ? "Follow back"
      : "Follow";

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "primary"}
      className={cn(
        "min-w-[92px]",
        isFollowing && hovering && "border-danger/40 text-danger",
        className,
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      loading={follow.isPending && follow.variables?.username === username}
      onClick={() =>
        follow.mutate({ username, following: !isFollowing })
      }
      aria-label={isFollowing ? `Unfollow ${username}` : `Follow ${username}`}
    >
      {!isFollowing ? <Plus className="size-3.5" /> : null}
      {follow.isPending && follow.variables?.username === username ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : null}
      {label}
    </Button>
  );
}
