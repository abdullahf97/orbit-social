import { db } from "@/server/db";
import { json, route } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const startedAt = Date.now();
  await db.$queryRaw`SELECT 1`;

  return json({
    status: "ok",
    database: "up",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
});
