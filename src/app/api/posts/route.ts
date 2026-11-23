import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  badRequest,
  getClientIp,
  json,
  parseBody,
  route,
  tooManyRequests,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { toPostDto } from "@/server/serializers";
import { isAllowedImageUrl } from "@/server/storage";
import { postSchema } from "@/lib/schemas";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const limit = rateLimit(`post:${viewer.id}:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) throw tooManyRequests("You're posting a lot. Take a breath.");

  const input = await parseBody(request, postSchema);

  if (!input.caption && !input.imageUrl) {
    throw badRequest("Add a caption or a photo.");
  }

  if (input.imageUrl && !isAllowedImageUrl(input.imageUrl)) {
    throw badRequest("That image URL is not allowed.");
  }

  try {
    const post = await db.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          ...(input.clientId ? { id: input.clientId } : {}),
          authorId: viewer.id,
          caption: input.caption,
          imageUrl: input.imageUrl ?? null,
          imageWidth: input.imageWidth ?? null,
          imageHeight: input.imageHeight ?? null,
        },
        include: {
          author: { select: authorSelect },
          likes: { where: { userId: viewer.id }, select: { userId: true } },
        },
      });

      await tx.user.update({
        where: { id: viewer.id },
        data: { postCount: { increment: 1 } },
      });

      return created;
    });

    return json({ post: toPostDto(post, viewer.id) }, { status: 201 });
  } catch (error) {
    // Idempotent retry: the client generated this id already.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.clientId
    ) {
      const existing = await db.post.findUnique({
        where: { id: input.clientId },
        include: {
          author: { select: authorSelect },
          likes: { where: { userId: viewer.id }, select: { userId: true } },
        },
      });
      if (existing) return json({ post: toPostDto(existing, viewer.id) });
    }
    throw error;
  }
});
