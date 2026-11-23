import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import {
  createSession,
  setSessionCookie,
  verifyPassword,
} from "@/server/auth";
import {
  assertSameOrigin,
  getClientIp,
  json,
  parseBody,
  route,
  tooManyRequests,
  unauthorized,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { toCurrentUser } from "@/server/serializers";
import { loginSchema } from "@/lib/schemas";

/**
 * A pre-computed hash used to keep the "no such user" path roughly as slow as
 * the "wrong password" path. Prevents trivial account enumeration by timing.
 */
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" +
  "ZHVtbXktaGFzaC1mb3ItdGltaW5nLWVxdWFsaXR5LWRvLW5vdC11c2U";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`login:ip:${ip}`, {
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (!ipLimit.ok) throw tooManyRequests("Too many sign-in attempts. Try again in a few minutes.");

  const input = await parseBody(request, loginSchema);
  const identifier = input.identifier.toLowerCase();

  const identifierLimit = rateLimit(`login:id:${identifier}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!identifierLimit.ok) {
    throw tooManyRequests("Too many attempts for this account. Try again later.");
  }

  const user = await db.user.findFirst({
    where: identifier.includes("@")
      ? { email: identifier }
      : { username: identifier },
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
      passwordHash: true,
    },
  });

  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !valid) {
    throw unauthorized("That username or password is incorrect.");
  }

  const session = await createSession(user.id, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  const response = json({ user: toCurrentUser(user) });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
});
