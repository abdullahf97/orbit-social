import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  decodeCursorSafe,
  encodeCursor,
  keysetFilter,
  parseLimit,
  toPage,
} from "./cursor";

const when = new Date("2026-02-14T10:30:00.000Z");

describe("cursor encoding", () => {
  it("round-trips a createdAt/id pair", () => {
    const encoded = encodeCursor({ createdAt: when, id: "post_123" });
    expect(decodeCursorSafe(encoded)).toEqual({
      createdAt: when.toISOString(),
      id: "post_123",
    });
  });

  it("produces a URL-safe token", () => {
    const encoded = encodeCursor({ createdAt: when, id: "abc/+==" });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns null for missing or malformed input", () => {
    expect(decodeCursorSafe(null)).toBeNull();
    expect(decodeCursorSafe("")).toBeNull();
    expect(decodeCursorSafe("not-base64-json")).toBeNull();
    expect(
      decodeCursorSafe(Buffer.from('{"id":"x"}').toString("base64url")),
    ).toBeNull();
  });

  it("rejects a cursor with an invalid timestamp", () => {
    const bad = Buffer.from(
      JSON.stringify({ createdAt: "yesterday", id: "x" }),
    ).toString("base64url");
    expect(decodeCursorSafe(bad)).toBeNull();
  });
});

describe("parseLimit", () => {
  it("defaults when absent or invalid", () => {
    expect(parseLimit(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("")).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("0")).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("-5")).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("2.5")).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("abc")).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps to the maximum", () => {
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit("9999")).toBe(MAX_PAGE_SIZE);
  });
});

describe("keysetFilter", () => {
  it("is empty without a cursor", () => {
    expect(keysetFilter(null)).toEqual({});
  });

  it("builds a descending (createdAt, id) predicate", () => {
    const filter = keysetFilter({ createdAt: when.toISOString(), id: "p1" });
    expect(filter).toEqual({
      OR: [
        { createdAt: { lt: when } },
        { createdAt: when, id: { lt: "p1" } },
      ],
    });
  });
});

describe("toPage", () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({
    id: `p${index}`,
    createdAt: new Date(when.getTime() - index * 1000),
  }));

  it("returns the next cursor when there is an extra row", () => {
    const page = toPage(rows, 8);
    expect(page.items).toHaveLength(8);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursorSafe(page.nextCursor)?.id).toBe("p7");
  });

  it("has no next cursor on the last page", () => {
    const page = toPage(rows.slice(0, 5), 8);
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });

  it("handles an empty result", () => {
    expect(toPage([], 8)).toEqual({ items: [], nextCursor: null });
  });
});
