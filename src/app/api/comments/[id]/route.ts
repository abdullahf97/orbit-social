import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  forbidden,
  json,
  notFound,
  route,
} from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { id } = await ctx.params;

  const comment = await db.comment.findUnique({
    where: { id },
    select: {
      authorId: true,
      postId: true,
      post: { select: { authorId: true } },
    },
  });

  if (!comment) throw notFound("That comment no longer exists.");

  const canDelete =
    comment.authorId === viewer.id || comment.post.authorId === viewer.id;
  if (!canDelete) throw forbidden("You can't delete that comment.");

  const removed = await db.$transaction(async (tx) => {
    const replies = await tx.comment.count({ where: { parentId: id } });
    await tx.comment.delete({ where: { id } });
    const total = replies + 1;

    await tx.post.updateMany({
      where: { id: comment.postId, commentCount: { gte: total } },
      data: { commentCount: { decrement: total } },
    });

    return total;
  });

  return json({ ok: true, removed });
});
