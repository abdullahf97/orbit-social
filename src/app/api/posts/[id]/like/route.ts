import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  getClientIp,
  json,
  notFound,
  route,
  tooManyRequests,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createNotification } from "@/server/notifications";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { id } = await ctx.params;

  const limit = rateLimit(`like:${viewer.id}:${getClientIp(request)}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.ok) throw tooManyRequests();

  const post = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!post) throw notFound("That post no longer exists.");

  const likeCount = await db.$transaction(async (tx) => {
    // skipDuplicates makes this safe to replay from the offline outbox.
    const inserted = await tx.like.createMany({
      data: [{ postId: id, userId: viewer.id }],
      skipDuplicates: true,
    });

    if (inserted.count > 0) {
      await tx.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });
      await createNotification(tx, {
        recipientId: post.authorId,
        actorId: viewer.id,
        type: "LIKE",
        postId: id,
      });
    }

    const updated = await tx.post.findUniqueOrThrow({
      where: { id },
      select: { likeCount: true },
    });
    return updated.likeCount;
  });

  return json({ liked: true, likeCount });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { id } = await ctx.params;

  const likeCount = await db.$transaction(async (tx) => {
    const removed = await tx.like.deleteMany({
      where: { postId: id, userId: viewer.id },
    });

    if (removed.count > 0) {
      await tx.post.updateMany({
        where: { id, likeCount: { gt: 0 } },
        data: { likeCount: { decrement: 1 } },
      });
    }

    const updated = await tx.post.findUniqueOrThrow({
      where: { id },
      select: { likeCount: true },
    });
    return updated.likeCount;
  });

  return json({ liked: false, likeCount });
});
