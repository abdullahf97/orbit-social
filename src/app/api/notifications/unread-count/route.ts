import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { noStore, route } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * Polled by the client every ~20s. Chosen over WebSockets/SSE because the app
 * deploys to Vercel's serverless runtime, where long-lived connections and
 * cross-instance pub/sub are not available without extra infrastructure.
 */
export const GET = route(async () => {
  const viewer = await requireUser();

  const count = await db.notification.count({
    where: { recipientId: viewer.id, readAt: null },
  });

  return noStore({ count });
});
