import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  badRequest,
  json,
  parseBody,
  route,
} from "@/server/http";
import { notificationReadSchema } from "@/lib/schemas";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const input = await parseBody(request, notificationReadSchema);

  if (!input.all && (!input.ids || input.ids.length === 0)) {
    throw badRequest("Pass `all: true` or a list of notification ids.");
  }

  await db.notification.updateMany({
    where: {
      recipientId: viewer.id,
      readAt: null,
      ...(input.all ? {} : { id: { in: input.ids } }),
    },
    data: { readAt: new Date() },
  });

  const unreadCount = await db.notification.count({
    where: { recipientId: viewer.id, readAt: null },
  });

  return json({ ok: true, unreadCount });
});
