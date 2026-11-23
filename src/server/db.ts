import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * Prisma 7 talks to Postgres through a driver adapter (node-postgres).
 * In development Next.js hot-reloads modules, so the client is cached on
 * globalThis to avoid exhausting the connection pool.
 */
function createClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === "production" ? 10 : 5,
  });

  return new PrismaClient({
    adapter,
    // Route handlers already log unhandled errors once (see server/http.ts).
    // Logging Prisma's "error" event too would print handled P2002 replays as
    // if they were failures.
    log: env.NODE_ENV === "development" ? ["warn"] : [],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
