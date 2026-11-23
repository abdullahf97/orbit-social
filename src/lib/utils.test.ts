import { describe, expect, it } from "vitest";
import { avatarGradient, cn, formatCount, initials, timeAgo } from "./utils";

describe("formatCount", () => {
  it("keeps small numbers exact", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("abbreviates thousands", () => {
    expect(formatCount(1000)).toBe("1k");
    expect(formatCount(1200)).toBe("1.2k");
    expect(formatCount(12_500)).toBe("12.5k");
  });

  it("abbreviates millions", () => {
    expect(formatCount(1_000_000)).toBe("1m");
    expect(formatCount(2_400_000)).toBe("2.4m");
  });
});

describe("initials", () => {
  it("takes up to two initials", () => {
    expect(initials("Nova Rahman")).toBe("NR");
    expect(initials("priya")).toBe("P");
    expect(initials("  Ana  Maria  Silva ")).toBe("AM");
  });

  it("handles empty input", () => {
    expect(initials("")).toBe("");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-03-01T12:00:00.000Z").getTime();

  it("collapses the first minute", () => {
    expect(timeAgo(new Date(now - 20_000), now)).toBe("just now");
    expect(timeAgo(new Date(now + 20_000), now)).toBe("just now");
  });

  it("uses relative units", () => {
    expect(timeAgo(new Date(now - 5 * 60_000), now)).toBe("5 minutes ago");
    expect(timeAgo(new Date(now - 3 * 3_600_000), now)).toBe("3 hours ago");
    expect(timeAgo(new Date(now - 2 * 86_400_000), now)).toBe("2 days ago");
    expect(timeAgo(new Date(now - 3 * 7 * 86_400_000), now)).toBe(
      "3 weeks ago",
    );
  });

  it("accepts ISO strings", () => {
    expect(timeAgo(new Date(now - 60_000).toISOString(), now)).toBe(
      "1 minute ago",
    );
  });
});

describe("avatarGradient", () => {
  it("is deterministic and returns a CSS gradient", () => {
    const a = avatarGradient("nova");
    const b = avatarGradient("nova");
    expect(a).toBe(b);
    expect(a).toMatch(/^linear-gradient\(135deg, hsl\(\d+ 62% 48%\)/);
  });

  it("differs between usernames", () => {
    expect(avatarGradient("nova")).not.toBe(avatarGradient("kai"));
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "b", ["c"])).toBe("a b c");
  });
});
