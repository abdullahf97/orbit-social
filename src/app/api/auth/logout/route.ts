import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  clearSessionCookie,
  revokeSession,
  sessionCookieName,
} from "@/server/auth";
import { assertSameOrigin, json, route } from "@/server/http";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (token) await revokeSession(token);

  const response = json({ ok: true });
  clearSessionCookie(response);
  return response;
});
