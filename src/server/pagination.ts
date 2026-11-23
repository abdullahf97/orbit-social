import "server-only";
import { decodeCursorSafe, type FeedCursor } from "@/lib/cursor";
import { badRequest } from "./http";

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  encodeCursor,
  keysetFilter,
  parseLimit,
  toPage,
  type FeedCursor,
} from "@/lib/cursor";

/** Server variant: an unreadable cursor is a client error, not "page one". */
export function decodeCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) return null;
  const cursor = decodeCursorSafe(raw);
  if (!cursor) throw badRequest("Invalid pagination cursor.");
  return cursor;
}
