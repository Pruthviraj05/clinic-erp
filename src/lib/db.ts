import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * In development Next.js hot-reloads modules, which would otherwise create a
 * new PrismaClient (and a new connection pool) on every reload. We cache the
 * instance on `globalThis` to avoid exhausting database connections.
 *
 * This is the production data-access entry point. It is imported by the
 * repository layer. Until DATABASE_URL points at a live database the app runs
 * in demo mode (see `appConfig.dataMode`) and this client is not queried.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
