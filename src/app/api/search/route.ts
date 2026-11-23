import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, route } from "@/server/http";
import { toPostDto, toPublicUser } from "@/server/serializers";
import type { PostDto, PublicUser } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export const GET = route(async (request: NextRequest) => {
  const viewer = await requireUser();
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (q.length === 0) {
    return noStore<{ users: PublicUser[]; posts: PostDto[] }>({
      users: [],
      posts: [],
    });
  }

  const [users, posts] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ followerCount: "desc" }, { createdAt: "asc" }],
      take: 8,
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
    }),
    db.post.findMany({
      where: {
        OR: [
          { caption: { contains: q, mode: "insensitive" } },
          { author: { username: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      include: {
        author: { select: authorSelect },
        likes: { where: { userId: viewer.id }, select: { userId: true } },
      },
    }),
  ]);

  return noStore({
    users: users.map(toPublicUser),
    posts: posts.map((post) => toPostDto(post, viewer.id)),
  });
});
