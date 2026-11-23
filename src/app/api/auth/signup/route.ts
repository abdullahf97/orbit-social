import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  appUrl,
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/server/auth";
import {
  assertSameOrigin,
  conflict,
  getClientIp,
  json,
  parseBody,
  route,
  tooManyRequests,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { toCurrentUser } from "@/server/serializers";
import { signupSchema } from "@/lib/schemas";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const ip = getClientIp(request);
  const limit = rateLimit(`signup:${ip}`, { limit: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) throw tooManyRequests();

  const input = await parseBody(request, signupSchema);

  const existing = await db.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    throw conflict(
      existing.email === input.email
        ? "An account with that email already exists."
        : "That username is taken.",
      {
        field: existing.email === input.email ? "email" : "username",
      },
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await db.user.create({
      data: {
        name: input.name,
        username: input.username,
        email: input.email,
        passwordHash,
      },
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
    });

    const session = await createSession(user.id, {
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    const response = json({ user: toCurrentUser(user) }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    response.headers.set("Location", `${appUrl()}/feed`);
    return response;
  } catch (error) {
    // Two simultaneous signups can pass the check above; the unique index wins.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("That username or email is already registered.");
    }
    throw error;
  }
});
