import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  badRequest,
  getClientIp,
  json,
  noStore,
  notFound,
  parseBody,
  route,
  tooManyRequests,
} from "@/server/http";
import { decodeCursor, encodeCursor, parseLimit } from "@/server/pagination";
import { rateLimit } from "@/server/rate-limit";
import { createNotification } from "@/server/notifications";
import { toCommentDto } from "@/server/serializers";
import { commentSchema, type CommentDto } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser();
  const { id } = await ctx.params;

  const cursor = decodeCursor(request.nextUrl.searchParams.get("cursor"));
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const rows = await db.comment.findMany({
    where: {
      postId: id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { gt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { gt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    include: { author: { select: authorSelect } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return noStore<{ items: CommentDto[]; nextCursor: string | null }>({
    items: page.map((comment) => toCommentDto(comment, viewer.id)),
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  });
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { id } = await ctx.params;

  const limit = rateLimit(`comment:${viewer.id}:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) throw tooManyRequests("You're commenting very fast.");

  const input = await parseBody(request, commentSchema);

  const post = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!post) throw notFound("That post no longer exists.");

  let parentAuthorId: string | null = null;
  if (input.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: input.parentId },
      select: { postId: true, authorId: true },
    });
    if (!parent || parent.postId !== id) {
      throw badRequest("That reply target no longer exists.");
    }
    parentAuthorId = parent.authorId;
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          ...(input.clientId ? { id: input.clientId } : {}),
          postId: id,
          authorId: viewer.id,
          body: input.body,
          parentId: input.parentId ?? null,
        },
        include: { author: { select: authorSelect } },
      });

      await tx.post.update({
        where: { id },
        data: { commentCount: { increment: 1 } },
      });

      await createNotification(tx, {
        recipientId: post.authorId,
        actorId: viewer.id,
        type: "COMMENT",
        postId: id,
        commentId: comment.id,
      });

      if (parentAuthorId && parentAuthorId !== post.authorId) {
        await createNotification(tx, {
          recipientId: parentAuthorId,
          actorId: viewer.id,
          type: "COMMENT",
          postId: id,
          commentId: comment.id,
        });
      }

      const updated = await tx.post.findUniqueOrThrow({
        where: { id },
        select: { commentCount: true },
      });

      return { comment, commentCount: updated.commentCount };
    });

    return json(
      {
        comment: toCommentDto(result.comment, viewer.id),
        commentCount: result.commentCount,
      },
      { status: 201 },
    );
  } catch (error) {
    // Offline outbox replay: the comment id is client generated.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.clientId
    ) {
      const existing = await db.comment.findUnique({
        where: { id: input.clientId },
        include: { author: { select: authorSelect } },
      });
      if (existing) {
        const postRow = await db.post.findUniqueOrThrow({
          where: { id },
          select: { commentCount: true },
        });
        return json({
          comment: toCommentDto(existing, viewer.id),
          commentCount: postRow.commentCount,
        });
      }
    }
    throw error;
  }
});
