import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import {
  assertSameOrigin,
  badRequest,
  getClientIp,
  json,
  route,
  tooManyRequests,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { processAvatar, processPostImage } from "@/server/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);

  const viewer = await requireUser();
  const limit = rateLimit(`upload:${viewer.id}:${getClientIp(request)}`, {
    limit: 40,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) throw tooManyRequests("Too many uploads. Try again later.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Send the image as multipart/form-data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file was uploaded.");

  const kind = form.get("kind");
  if (kind === "avatar") {
    const avatar = await processAvatar(file);
    return json({ ...avatar, width: 512, height: 512, thumbUrl: null });
  }

  const image = await processPostImage(file);
  return json(image);
});
