import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Password hashing with scrypt from node:crypto.
 *
 * Why not bcrypt/argon2? Both need native binaries that complicate serverless
 * builds. scrypt is memory-hard, in the standard library, and has no install
 * step. Stored format: scrypt$N$r$p$<salt-b64url>$<hash-b64url>
 *
 * This module intentionally has no `server-only` import so the seed script and
 * unit tests can use it outside the Next.js runtime.
 */
const SCRYPT_KEYLEN = 64;

function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;

  const derived = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, nRaw, rRaw, pRaw, saltRaw, hashRaw] = stored.split("$");

  if (
    scheme !== "scrypt" ||
    !nRaw ||
    !rRaw ||
    !pRaw ||
    !saltRaw ||
    !hashRaw
  ) {
    return false;
  }

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const expected = Buffer.from(hashRaw, "base64url");
  const salt = Buffer.from(saltRaw, "base64url");

  try {
    const derived = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
