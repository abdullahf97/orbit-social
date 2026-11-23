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
import { toPublicUser } from "@/server/serializers";
import { isAllowedImageUrl } from "@/server/storage";
import { profileSchema } from "@/lib/schemas";

export const PATCH = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const input = await parseBody(request, profileSchema);

  if (input.avatarUrl && !isAllowedImageUrl(input.avatarUrl)) {
    throw badRequest("That avatar URL is not allowed.");
  }

  const user = await db.user.update({
    where: { id: viewer.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatarUrl !== undefined
        ? { avatarUrl: input.avatarUrl }
        : {}),
    },
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

  return json({ user: toPublicUser(user) });
});
