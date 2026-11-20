import "server-only";
import { Prisma } from "@prisma/client";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import type { ReportFilters } from "./filters";
import { reportOrderWhere } from "./filters";

export interface ProductReportRow {
  id: string;
  nameAr: string;
  nameEn: string | null;
  categoryAr: string | null;
  categoryEn: string | null;
  quantity: number;
  revenue: number | null;
  cost: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
}

export async function loadProductReport(membership: ActiveMembership, filters: ReportFilters) {
  const allowedIds = branchIdsForPermission(membership, "reports.view");
  if (filters.branchId && allowedIds !== null && !allowedIds.includes(filters.branchId)) throw new Error("BRANCH_SCOPE_VIOLATION");
  const financialVisible = membership.isOwner || membership.permissions.has("reports.financial.view");
  const orderWhere = reportOrderWhere(membership, filters);
  const [products, groupedItems] = await Promise.all([
    db.product.findMany({
      where: { restaurantId: membership.restaurantId, deletedAt: null },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        costPrice: true,
        category: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: { nameAr: "asc" },
      take: 10_000,
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { is: { ...orderWhere, status: "COMPLETED" } } },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);
  const groupedByProduct = new Map(groupedItems.filter((entry) => entry.productId).map((entry) => [entry.productId!, entry]));
  const rows: ProductReportRow[] = products.map((product) => {
    const totals = groupedByProduct.get(product.id);
    const quantity = totals?._sum.quantity ?? 0;
    const rawRevenue = totals?._sum.lineTotal?.toNumber() ?? 0;
    const currentCost = product.costPrice?.toNumber() ?? null;
    const revenue = financialVisible ? rawRevenue : null;
    const cost = financialVisible ? currentCost : null;
    const grossProfit = financialVisible && currentCost !== null ? rawRevenue - currentCost * quantity : null;
    const grossMarginPercent = grossProfit !== null && rawRevenue > 0 ? (grossProfit / rawRevenue) * 100 : null;
    return {
      id: product.id,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      categoryAr: product.category?.nameAr ?? null,
      categoryEn: product.category?.nameEn ?? null,
      quantity,
      revenue,
      cost,
      grossProfit,
      grossMarginPercent,
    };
  });
  rows.sort((a, b) => b.quantity - a.quantity || a.nameAr.localeCompare(b.nameAr));
  const soldRows = rows.filter((row) => row.quantity > 0);
  const costCoveredRows = rows.filter((row) => row.quantity > 0 && row.grossProfit !== null);
  return {
    rows,
    financialVisible,
    productCount: rows.length,
    soldProductCount: soldRows.length,
    unsoldProductCount: rows.length - soldRows.length,
    totalUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
    totalRevenue: financialVisible ? rows.reduce((sum, row) => sum + (row.revenue ?? 0), 0) : null,
    estimatedGrossProfit: financialVisible ? costCoveredRows.reduce((sum, row) => sum + (row.grossProfit ?? 0), 0) : null,
    costCoveredProductCount: costCoveredRows.length,
    productListCapped: products.length === 10_000,
  };
}

export function productReportOrderWhere(membership: ActiveMembership, filters: ReportFilters): Prisma.OrderWhereInput {
  return reportOrderWhere(membership, filters);
}
