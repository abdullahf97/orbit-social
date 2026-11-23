import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { env } from "./env";
import { badRequest } from "./http";

export type StoredImage = {
  url: string;
  width: number;
  height: number;
  thumbUrl: string | null;
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif"]);

function assertUploadSize(size: number) {
  if (size <= 0) throw badRequest("That file is empty.");
  if (size > MAX_UPLOAD_BYTES) {
    throw badRequest("Images must be 4 MB or smaller.");
  }
}

async function store(
  folder: string,
  name: string,
  buffer: Buffer,
): Promise<string> {
  const key = `${folder}/${name}.webp`;

  if (env.STORAGE_DRIVER === "vercel-blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is required for Vercel Blob.");
    }
    const blob = await put(key, buffer, {
      access: "public",
      contentType: "image/webp",
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  // Local disk adapter — development only. Serverless filesystems are read-only.
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.webp`), buffer);
  return `/uploads/${folder}/${name}.webp`;
}

function uniqueName(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
}

/**
 * Decodes the upload with sharp (which also validates it really is an image),
 * strips EXIF, corrects orientation, and emits two WebP sizes.
 */
export async function processPostImage(file: File): Promise<StoredImage> {
  assertUploadSize(file.size);

  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "error",
  }).rotate();

  const metadata = await pipeline.metadata();
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw badRequest("Upload a JPEG, PNG, WebP, AVIF or GIF image.");
  }

  const full = await pipeline
    .clone()
    .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await sharp(full.data)
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();

  const base = uniqueName("post");
  const url = await store("posts", base, full.data);
  const thumbUrl = await store("posts", `${base}-thumb`, thumb);

  return {
    url,
    thumbUrl,
    width: full.info.width,
    height: full.info.height,
  };
}

/**
 * Users may only attach images that we produced. This blocks hot-linking,
 * tracking pixels, and javascript:/data: URLs from ending up in the feed.
 */
export function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function processAvatar(file: File): Promise<{ url: string }> {
  assertUploadSize(file.size);

  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "error",
  }).rotate();

  const metadata = await pipeline.metadata();
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw badRequest("Upload a JPEG, PNG, WebP, AVIF or GIF image.");
  }

  const avatar = await pipeline
    .clone()
    .resize({ width: 512, height: 512, fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();

  const url = await store("avatars", uniqueName("avatar"), avatar);
  return { url };
}
