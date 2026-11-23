import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { noStore, route } from "@/server/http";
import { toCurrentUser } from "@/server/serializers";
import type { SessionResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return noStore<SessionResponse>({ user: null, unreadNotifications: 0 });
  }

  const [full, unread] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        followerCount: true,
        followingCount: true,
        postCount: true,
      },
    }),
    db.notification.count({
      where: { recipientId: user.id, readAt: null },
    }),
  ]);

  return noStore<SessionResponse>({
    user: toCurrentUser(full),
    unreadNotifications: unread,
  });
});
