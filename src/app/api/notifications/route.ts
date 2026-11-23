import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, route } from "@/server/http";
import { decodeCursor, keysetFilter, parseLimit, toPage } from "@/server/pagination";
import { toNotificationDto } from "@/server/serializers";
import type { NotificationDto } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  const viewer = await requireUser();
  const cursor = decodeCursor(request.nextUrl.searchParams.get("cursor"));
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { recipientId: viewer.id, ...keysetFilter(cursor) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        actor: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        post: { select: { id: true, imageUrl: true, caption: true } },
        comment: { select: { body: true } },
      },
    }),
    db.notification.count({
      where: { recipientId: viewer.id, readAt: null },
    }),
  ]);

  const page = toPage(rows, limit);

  return noStore<{
    items: NotificationDto[];
    nextCursor: string | null;
    unreadCount: number;
  }>({
    items: page.items.map(toNotificationDto),
    nextCursor: page.nextCursor,
    unreadCount,
  });
});
