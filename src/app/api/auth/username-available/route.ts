import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { getClientIp, json, route, tooManyRequests } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { usernameSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function suggestionsFor(base: string): string[] {
  const cleaned = base.replace(/[^a-z0-9_]/g, "").slice(0, 14) || "orbit";
  const suffixes = ["hq", "daily", "photo", "gram"];
  return suffixes.map((suffix, index) => {
    if (index === 0) return `${cleaned}_${ALPHABET[index + 2]}${ALPHABET[index + 7]}`;
    return `${cleaned}${suffix}`.slice(0, 20);
  });
}

/**
 * Called on every keystroke (debounced) from the signup form.
 */
export const GET = route(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const limit = rateLimit(`username:${ip}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.ok) throw tooManyRequests();

  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const parsed = usernameSchema.safeParse(raw);

  if (!parsed.success) {
    return json({
      available: false,
      reason: parsed.error.issues[0]?.message ?? "Invalid username.",
      suggestions: [],
    });
  }

  const taken = await db.user.findUnique({
    where: { username: parsed.data },
    select: { id: true },
  });

  return json({
    available: !taken,
    reason: taken ? "That username is taken." : null,
    suggestions: taken ? suggestionsFor(parsed.data) : [],
  });
});
