import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** The transaction client passed to `prisma.$transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Prisma's Json input type rejects plain interfaces; this casts a JSON-serialisable value. */
export function asJson<T>(value: T): import("@prisma/client").Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
