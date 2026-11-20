import "server-only";
import type { OrderStatus, OrderType, Prisma } from "@prisma/client";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { average, durationMinutes, roundTo } from "./metrics";
import type { ReportFilters } from "./filters";
import { reportOrderAccessWhere, reportOrderWhere } from "./filters";

export async function loadOrderReport(membership: ActiveMembership, filters: ReportFilters) {
  const allowedIds = branchIdsForPermission(membership, "reports.view");
  if (filters.branchId && allowedIds !== null && !allowedIds.includes(filters.branchId)) throw new Error("BRANCH_SCOPE_VIOLATION");
  const financialVisible = membership.isOwner || membership.permissions.has("reports.financial.view");
  const orderWhere = reportOrderWhere(membership, filters);
  const orderAccessWhere = reportOrderAccessWhere(membership, filters.branchId);
  const [statusGroups, typeGroups, financialSummary, preparationRows, transitionGroups] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
    db.order.groupBy({ by: ["type"], where: orderWhere, _count: { _all: true } }),
    financialVisible
      ? db.order.aggregate({ where: { ...orderWhere, status: "COMPLETED" }, _count: { _all: true }, _sum: { total: true }, _avg: { total: true } })
      : Promise.resolve(null),
    db.order.findMany({
      where: { ...orderWhere, status: "COMPLETED", preparingAt: { not: null }, readyAt: { not: null } },
      select: { preparingAt: true, readyAt: true },
      orderBy: { completedAt: "desc" },
      take: 100_001,
    }),
    db.orderStatusHistory.groupBy({
      by: ["toStatus"],
      where: {
        createdAt: { gte: filters.start, lt: filters.end },
        toStatus: { in: ["CANCELLED", "REJECTED"] },
        order: { is: orderAccessWhere },
      },
      _count: { _all: true },
    }),
  ]);
  const statuses = statusGroups.map((group) => ({ status: group.status as OrderStatus, count: group._count._all }));
  const types = typeGroups.map((group) => ({ type: group.type as OrderType, count: group._count._all }));
  const cancelled = transitionGroups.find((group) => group.toStatus === "CANCELLED")?._count._all ?? 0;
  const rejected = transitionGroups.find((group) => group.toStatus === "REJECTED")?._count._all ?? 0;
  const sampledPrepRows = preparationRows.slice(0, 100_000);
  const preparationMinutes = sampledPrepRows
    .map((row) => durationMinutes(row.preparingAt, row.readyAt))
    .filter((value): value is number => value !== null);
  const averageOrderValue = financialSummary?._avg.total?.toNumber() ?? null;
  const completedSales = financialSummary?._sum.total?.toNumber() ?? null;
  return {
    financialVisible,
    totalOrders: statuses.reduce((sum, entry) => sum + entry.count, 0),
    completedOrders: statuses.find((entry) => entry.status === "COMPLETED")?.count ?? 0,
    averageOrderValue,
    completedSales,
    averagePreparationMinutes: roundTo(average(preparationMinutes)),
    preparationSampled: preparationRows.length > 100_000,
    cancelled,
    rejected,
    statuses,
    types,
  };
}

export function orderReportWhere(membership: ActiveMembership, filters: ReportFilters): Prisma.OrderWhereInput {
  return reportOrderWhere(membership, filters);
}
