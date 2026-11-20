import "server-only";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { attributeSalesToPaymentMethod } from "@/lib/finance";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission, branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { db } from "@/lib/db";

export type SalesGranularity = "day" | "week" | "month" | "year";
export interface SalesRange { start: Date; end: Date; branchId?: string; method?: PaymentMethod; granularity: SalesGranularity }
export interface SalesOrderRow {
  orderNumber: number; createdAt: Date; branchName: string | null; type: string; currency: string;
  total: number; discount: number; tax: number; payments: Array<{ method: PaymentMethod; amount: number; paidAt: Date }>;
}
export interface SalesSummary {
  count: number; total: number; discount: number; tax: number; average: number;
  methodTotals: Array<{ method: PaymentMethod; amount: number; count: number }>;
  series: Array<{ key: string; count: number; total: number }>;
  rows: SalesOrderRow[];
}

function orderWhere(membership: ActiveMembership, range: SalesRange): Prisma.OrderWhereInput {
  const allowedBranches = branchIdsForPermission(membership, "reports.financial.view");
  if (range.branchId && allowedBranches !== null && !allowedBranches.includes(range.branchId)) throw new Error("BRANCH_SCOPE_VIOLATION");
  return {
    restaurantId: membership.restaurantId,
    status: "COMPLETED",
    createdAt: { gte: range.start, lt: range.end },
    ...branchScopeWhere(membership, "reports.financial.view", "branchId"),
    ...ownedOrderWhere(membership, "reports.financial.view"),
    ...(range.branchId ? { branchId: range.branchId } : {}),
    ...(range.method ? { payments: { some: { method: range.method, status: "PAID", paidAt: { gte: range.start, lt: range.end } } } } : {}),
  } as Prisma.OrderWhereInput;
}

function weekStartUTC(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
}

function bucketKey(date: Date, granularity: SalesGranularity) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  if (granularity === "year") return String(year);
  if (granularity === "month") return `${year}-${month}`;
  if (granularity === "week") return weekStartUTC(date).toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

async function queryRows(membership: ActiveMembership, range: SalesRange) {
  return db.order.findMany({
    where: orderWhere(membership, range),
    select: {
      orderNumber: true, createdAt: true, type: true, currency: true, total: true, discount: true, tax: true, branchId: true,
      payments: { where: { status: "PAID", paidAt: { gte: range.start, lt: range.end }, ...(range.method ? { method: range.method } : {}) }, select: { method: true, amount: true, paidAt: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100_000,
  });
}

function summarize(rows: Awaited<ReturnType<typeof queryRows>>, granularity: SalesGranularity, branchNames: Map<string, string>, method?: PaymentMethod): SalesSummary {
  const methodTotals = new Map<PaymentMethod, { amount: number; count: number }>();
  const series = new Map<string, { count: number; total: number }>();
  let total = 0;
  let discount = 0;
  let tax = 0;
  const values = rows.map((row) => {
    if (!method) return { row, total: row.total, discount: row.discount, tax: row.tax };
    const paymentCents = row.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)).mul(100).toNumber();
    const allocated = attributeSalesToPaymentMethod(row.total.mul(100).toNumber(), row.discount.mul(100).toNumber(), row.tax.mul(100).toNumber(), paymentCents);
    return { row, total: new Prisma.Decimal(allocated.salesCents).div(100), discount: new Prisma.Decimal(allocated.discountCents).div(100), tax: new Prisma.Decimal(allocated.taxCents).div(100) };
  });
  for (const { row, total: attributedTotal, discount: attributedDiscount, tax: attributedTax } of values) {
    const rowTotal = attributedTotal.toNumber();
    total += rowTotal; discount += attributedDiscount.toNumber(); tax += attributedTax.toNumber();
    const key = bucketKey(row.createdAt, granularity);
    const bucket = series.get(key) ?? { count: 0, total: 0 };
    bucket.count += 1; bucket.total += rowTotal; series.set(key, bucket);
    for (const payment of row.payments) {
      const current = methodTotals.get(payment.method) ?? { amount: 0, count: 0 };
      current.amount += payment.amount.toNumber(); current.count += 1; methodTotals.set(payment.method, current);
    }
  }
  return {
    count: rows.length, total, discount, tax, average: rows.length ? total / rows.length : 0,
    methodTotals: [...methodTotals.entries()].map(([method, value]) => ({ method, ...value })).sort((a, b) => b.amount - a.amount),
    series: [...series.entries()].map(([key, value]) => ({ key, ...value })).sort((a, b) => a.key.localeCompare(b.key)),
    rows: values.map(({ row, total: attributedTotal, discount: attributedDiscount, tax: attributedTax }) => ({ orderNumber: row.orderNumber, createdAt: row.createdAt, branchName: row.branchId ? branchNames.get(row.branchId) ?? null : null, type: row.type, currency: row.currency, total: attributedTotal.toNumber(), discount: attributedDiscount.toNumber(), tax: attributedTax.toNumber(), payments: row.payments.map((payment) => ({ method: payment.method, amount: payment.amount.toNumber(), paidAt: payment.paidAt })) })),
  };
}

export async function loadSalesReport(membership: ActiveMembership, range: SalesRange) {
  if (range.end <= range.start || range.end.getTime() - range.start.getTime() > 366 * 24 * 60 * 60 * 1000) throw new Error("INVALID_REPORT_RANGE");
  const currentRows = await queryRows(membership, range);
  const duration = range.end.getTime() - range.start.getTime();
  const previousRange = { ...range, start: new Date(range.start.getTime() - duration), end: range.start };
  const previousRows = await queryRows(membership, previousRange);
  const branchIds = [...new Set([...currentRows, ...previousRows].map((row) => row.branchId).filter((id): id is string => Boolean(id)))];
  const branches = branchIds.length ? await db.branch.findMany({ where: { restaurantId: membership.restaurantId, id: { in: branchIds } }, select: { id: true, name: true } }) : [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  return { current: summarize(currentRows, range.granularity, branchNames, range.method), previous: summarize(previousRows, range.granularity, branchNames, range.method), previousRange };
}
