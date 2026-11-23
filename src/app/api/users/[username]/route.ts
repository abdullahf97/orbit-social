import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, notFound, route } from "@/server/http";
import { toPublicUser } from "@/server/serializers";
import type { ProfileResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser();
  const { username } = await ctx.params;

  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      followerCount: true,
      followingCount: true,
      postCount: true,
    },
  });

  if (!user) throw notFound("That profile doesn't exist.");

  const [follows, followsMe] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewer.id,
          followingId: user.id,
        },
      },
      select: { id: true },
    }),
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: viewer.id,
        },
      },
      select: { id: true },
    }),
  ]);

  return noStore<ProfileResponse>({
    user: toPublicUser(user),
    isMe: viewer.id === user.id,
    isFollowing: Boolean(follows),
    followsMe: Boolean(followsMe),
  });
});
