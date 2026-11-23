import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, route } from "@/server/http";
import {
  decodeCursor,
  keysetFilter,
  parseLimit,
  toPage,
} from "@/server/pagination";
import { toPostDto } from "@/server/serializers";
import type { FeedPage } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export const GET = route(async (request: NextRequest) => {
  const viewer = await requireUser();
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "explore" ? "explore" : "following";
  const cursor = decodeCursor(params.get("cursor"));
  const limit = parseLimit(params.get("limit"));

  const rows = await db.post.findMany({
    where: {
      ...(mode === "following"
        ? {
            author: {
              OR: [
                { id: viewer.id },
                { followers: { some: { followerId: viewer.id } } },
              ],
            },
          }
        : {}),
      ...keysetFilter(cursor),
    },
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
