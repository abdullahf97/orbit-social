import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, notFound, route } from "@/server/http";
import { decodeCursor, keysetFilter, parseLimit, toPage } from "@/server/pagination";
import { toPostDto } from "@/server/serializers";
import type { FeedPage } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

type Ctx = { params: Promise<{ username: string }> };

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser();
  const { username } = await ctx.params;

  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw notFound("That profile doesn't exist.");

  const cursor = decodeCursor(request.nextUrl.searchParams.get("cursor"));
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const rows = await db.post.findMany({
    where: { authorId: user.id, ...keysetFilter(cursor) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      author: { select: authorSelect },
      likes: { where: { userId: viewer.id }, select: { userId: true } },
    },
  });

  const page = toPage(rows, limit);

  return noStore<FeedPage>({
    items: page.items.map((post) => toPostDto(post, viewer.id)),
    nextCursor: page.nextCursor,
  });
});
