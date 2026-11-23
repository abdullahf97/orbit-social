import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  badRequest,
  json,
  notFound,
  route,
} from "@/server/http";
import { createNotification } from "@/server/notifications";

type Ctx = { params: Promise<{ username: string }> };

async function loadTarget(username: string) {
  const target = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, followerCount: true },
  });
  if (!target) throw notFound("That profile doesn't exist.");
  return target;
}

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { username } = await ctx.params;
  const target = await loadTarget(username);

  if (target.id === viewer.id) throw badRequest("You can't follow yourself.");

  const followerCount = await db.$transaction(async (tx) => {
    const inserted = await tx.follow.createMany({
      data: [{ followerId: viewer.id, followingId: target.id }],
      skipDuplicates: true,
    });

    if (inserted.count > 0) {
      await tx.user.update({
        where: { id: target.id },
        data: { followerCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: viewer.id },
        data: { followingCount: { increment: 1 } },
      });
      await createNotification(tx, {
        recipientId: target.id,
        actorId: viewer.id,
        type: "FOLLOW",
      });
    }

    const updated = await tx.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { followerCount: true },
    });
    return updated.followerCount;
  });

  return json({ following: true, followerCount });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { username } = await ctx.params;
  const target = await loadTarget(username);

  const followerCount = await db.$transaction(async (tx) => {
    const removed = await tx.follow.deleteMany({
      where: { followerId: viewer.id, followingId: target.id },
    });

    if (removed.count > 0) {
      await tx.user.updateMany({
        where: { id: target.id, followerCount: { gt: 0 } },
        data: { followerCount: { decrement: 1 } },
      });
      await tx.user.updateMany({
        where: { id: viewer.id, followingCount: { gt: 0 } },
        data: { followingCount: { decrement: 1 } },
      });
    }

    const updated = await tx.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { followerCount: true },
    });
    return updated.followerCount;
  });

  return json({ following: false, followerCount });
});
