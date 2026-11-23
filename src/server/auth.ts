import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "./db";
import { env, isProduction } from "./env";
import { unauthorized } from "./http";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

const SESSION_COOKIE = "orbit_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Sessions — opaque random tokens. Only the SHA-256 hash is stored, so a
// database leak cannot be replayed. Revocable by deleting a row.
// ---------------------------------------------------------------------------

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ip: meta.ip ?? null,
    },
  });

  return { token, expiresAt };
}

export async function revokeSession(token: string) {
  await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function revokeAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
};

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function appUrl() {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
