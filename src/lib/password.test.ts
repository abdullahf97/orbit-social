import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/password";

describe("password hashing", () => {
  it("stores a scrypt descriptor rather than the password", async () => {
    const hash = await hashPassword("orbitdemo");
    const [scheme, N, r, p, salt, digest] = hash.split("$");

    expect(scheme).toBe("scrypt");
    expect(Number(N)).toBe(16384);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
    expect(salt).toBeTruthy();
    expect(digest).toBeTruthy();
    expect(hash).not.toContain("orbitdemo");
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(
      verifyPassword("correct horse battery staple", hash),
    ).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("Correct horse battery staple", hash)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("uses a fresh salt for every hash", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(a).not.toBe(b);
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("fails closed on malformed stored values", async () => {
    for (const stored of [
      "",
      "plaintext",
      "scrypt$16384$8$1$onlyfive",
      "bcrypt$16384$8$1$c2FsdA$aGFzaA",
      "scrypt$notanumber$8$1$c2FsdA$aGFzaA",
    ]) {
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    }
  });
});
