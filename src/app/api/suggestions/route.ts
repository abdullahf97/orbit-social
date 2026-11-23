import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, route } from "@/server/http";
import { toPublicUser } from "@/server/serializers";
import type { PublicUser } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const viewer = await requireUser();

  const users = await db.user.findMany({
    where: {
      id: { not: viewer.id },
      followers: { none: { followerId: viewer.id } },
    },
    orderBy: [{ followerCount: "desc" }, { createdAt: "asc" }],
    take: 5,
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      followerCount: true,
      followingCount: true,
      postCount: true,
    },
  });

  return noStore<{ users: PublicUser[] }>({
    users: users.map(toPublicUser),
  });
});
