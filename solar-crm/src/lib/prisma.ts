import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Neon's pooled connection (host contains "-pooler") runs PgBouncer in transaction mode; Prisma needs pgbouncer=true there. */
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (url && /-pooler\./.test(url) && !/[?&]pgbouncer=/.test(url)) return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  return url;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** The transaction client passed to `prisma.$transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Prisma's Json input type rejects plain interfaces; this casts a JSON-serialisable value. */
export function asJson<T>(value: T): import("@prisma/client").Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
