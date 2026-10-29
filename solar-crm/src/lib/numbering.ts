import type { Tx } from "./prisma";
import { financialYear } from "./format";

/** Atomically takes the next number in a per-financial-year series. */
export async function nextSeq(tx: Tx, series: string, date: Date = new Date()): Promise<{ n: number; fy: string }> {
  const fy = financialYear(date);
  const c = await tx.counter.upsert({
    where: { key: `${series}:${fy}` },
    create: { key: `${series}:${fy}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return { n: c.value, fy };
}

/** SSS/EPC/26-27/023 */
export async function nextQuoteNumber(tx: Tx, prefix: string, date?: Date): Promise<string> {
  const { n, fy } = await nextSeq(tx, "quote", date);
  return `${prefix}/${fy}/${String(n).padStart(3, "0")}`;
}

/** SS/26-27/014 */
export async function nextInvoiceNumber(tx: Tx, prefix: string, date?: Date): Promise<string> {
  const { n, fy } = await nextSeq(tx, "invoice", date);
  return `${prefix}/${fy}/${String(n).padStart(3, "0")}`;
}

/** P-26-27-001 */
export async function nextProjectCode(tx: Tx, date?: Date): Promise<string> {
  const { n, fy } = await nextSeq(tx, "project", date);
  return `P-${fy}-${String(n).padStart(3, "0")}`;
}
