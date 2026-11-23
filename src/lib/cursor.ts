import { z } from "zod";

/**
 * Keyset (cursor) pagination primitives.
 *
 * Offset pagination gets slower and duplicates rows when new posts arrive
 * while a user scrolls. We order by `(createdAt DESC, id DESC)` and pass the
 * last row's pair back as an opaque cursor.
 *
 * This module is isomorphic on purpose so the encoding can be unit tested
 * without booting the server.
 */
const cursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.string().min(1).max(64),
});

export type FeedCursor = z.infer<typeof cursorSchema>;

export function encodeCursor(input: { createdAt: Date; id: string }): string {
  const payload: FeedCursor = {
    createdAt: input.createdAt.toISOString(),
    id: input.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursorSafe(raw: string | null | undefined): FeedCursor | null {
  if (!raw) return null;

  try {
    const json = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as unknown;
    const parsed = cursorSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 24;

export function parseLimit(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(value, MAX_PAGE_SIZE);
}

/** Builds the `where` fragment for a descending keyset scan. */
export function keysetFilter(cursor: FeedCursor | null) {
  if (!cursor) return {};
  const createdAt = new Date(cursor.createdAt);
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: cursor.id } },
    ],
  };
}

export function toPage<T extends { createdAt: Date; id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}
