import "server-only";
import type { Prisma } from "@prisma/client";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission, branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import type { ReportDateRange } from "./date-range";

export interface ReportFilters extends ReportDateRange {
  branchId?: string;
}

export async function getReportBranches(membership: ActiveMembership, requestedBranchId?: string) {
  const allowedIds = branchIdsForPermission(membership, "reports.view");
  const branches = await db.branch.findMany({
    where: {
      restaurantId: membership.restaurantId,
      isActive: true,
      ...(allowedIds === null ? {} : { id: { in: allowedIds } }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (requestedBranchId && !branches.some((branch) => branch.id === requestedBranchId)) {
    throw new Error("BRANCH_SCOPE_VIOLATION");
  }
  return { branches, branchId: requestedBranchId || undefined, allowedIds };
}

export function reportOrderAccessWhere(membership: ActiveMembership, branchId?: string): Prisma.OrderWhereInput {
  return {
    restaurantId: membership.restaurantId,
    ...branchScopeWhere(membership, "reports.view", "branchId"),
    ...ownedOrderWhere(membership, "reports.view"),
    ...(branchId ? { branchId } : {}),
  } as Prisma.OrderWhereInput;
}

export function reportOrderWhere(membership: ActiveMembership, filters: ReportFilters): Prisma.OrderWhereInput {
  return {
    ...reportOrderAccessWhere(membership, filters.branchId),
    createdAt: { gte: filters.start, lt: filters.end },
  };
}

export function reportActivityWhere(
  membership: ActiveMembership,
  filters: ReportFilters,
): Pick<Prisma.StaffActivityLogWhereInput, "branchId"> {
  if (membership.isOwner || membership.permissionScopes.get("reports.view") === "RESTAURANT") {
    return filters.branchId ? { branchId: filters.branchId } : {};
  }
  const allowedIds = filters.branchId ? [filters.branchId] : membership.branchAccessIds.concat(membership.branchId ?? []);
  return { branchId: { in: allowedIds.length ? [...new Set(allowedIds)] : ["__no_access__"] } };
}
