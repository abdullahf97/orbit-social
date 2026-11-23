import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  forbidden,
  json,
  noStore,
  notFound,
  route,
} from "@/server/http";
import { toPostDto } from "@/server/serializers";
import type { PostDto } from "@/lib/schemas";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser();
  const { id } = await ctx.params;

  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      likes: { where: { userId: viewer.id }, select: { userId: true } },
    },
  });

  if (!post) throw notFound("That post no longer exists.");

  return noStore<{ post: PostDto }>({ post: toPostDto(post, viewer.id) });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const { id } = await ctx.params;

  const post = await db.post.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!post) throw notFound("That post no longer exists.");
  if (post.authorId !== viewer.id) {
    throw forbidden("You can only delete your own posts.");
  }

  await db.$transaction([
    db.post.delete({ where: { id } }),
    db.user.updateMany({
      where: { id: viewer.id, postCount: { gt: 0 } },
      data: { postCount: { decrement: 1 } },
    }),
  ]);

  return json({ ok: true });
});
