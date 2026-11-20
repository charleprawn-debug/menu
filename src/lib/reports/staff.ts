import "server-only";
import type { Prisma } from "@prisma/client";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission, hasRestaurantWideScope } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { average, durationMinutes, roundTo } from "./metrics";
import type { ReportFilters } from "./filters";
import { reportActivityWhere, reportOrderAccessWhere, reportOrderWhere } from "./filters";

export interface StaffReportRow {
  userId: string;
  name: string;
  roles: Array<{ name: string; nameEn: string | null }>;
  branches: string[];
  ordersCreated: number;
  averagePreparationMinutes: number | null;
  readyEvents: number;
  cancelledOperations: number;
  rejectedOperations: number;
  priceChanges: number;
  activityEvents: number;
}

function countByActor<T>(entries: ReadonlyArray<T>, actorId: (entry: T) => string | null, count: (entry: T) => number) {
  return new Map(entries.flatMap((entry) => {
    const id = actorId(entry);
    return id ? [[id, count(entry)] as const] : [];
  }));
}

export async function loadStaffReport(membership: ActiveMembership, filters: ReportFilters) {
  const scope = membership.permissionScopes.get("reports.view") ?? "RESTAURANT";
  const allowedIds = branchIdsForPermission(membership, "reports.view");
  if (filters.branchId && allowedIds !== null && !allowedIds.includes(filters.branchId)) throw new Error("BRANCH_SCOPE_VIOLATION");

  let staffBranchIds: string[] | null = null;
  if (filters.branchId) staffBranchIds = [filters.branchId];
  else if (!membership.isOwner && scope === "BRANCH") staffBranchIds = allowedIds ?? [];
  else if (!membership.isOwner && scope === "OWNED") staffBranchIds = allowedIds ?? [];

  const memberWhere: Prisma.RestaurantMemberWhereInput = {
    restaurantId: membership.restaurantId,
    status: { not: "INVITED" },
    ...(scope === "OWNED" && !membership.isOwner ? { userId: membership.userId } : {}),
    ...(staffBranchIds === null ? {} : staffBranchIds.length ? {
      OR: [
        { branchId: { in: staffBranchIds } },
        { branchAccess: { some: { branchId: { in: staffBranchIds } } } },
      ],
    } : { id: "__no_access__" }),
  };
  const members = await db.restaurantMember.findMany({
    where: memberWhere,
    select: {
      userId: true,
      title: true,
      user: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      branchAccess: { select: { branchId: true, branch: { select: { id: true, name: true } } } },
      roles: { select: { role: { select: { name: true, nameEn: true } } } },
    },
    orderBy: { user: { name: "asc" } },
    take: 10_001,
  });
  const sampleMembers = members.slice(0, 10_000);
  const userIds = sampleMembers.map((member) => member.userId);
  const orderWhere = reportOrderWhere(membership, filters);
  const orderAccessWhere = reportOrderAccessWhere(membership, filters.branchId);
  const [createdOrderGroups, transitionGroups, activityGroups, priceGroups, readyEvents] = userIds.length ? await Promise.all([
    db.order.groupBy({ by: ["createdById"], where: { ...orderWhere, createdById: { in: userIds } }, _count: { _all: true } }),
    db.orderStatusHistory.groupBy({
      by: ["changedById", "toStatus"],
      where: {
        createdAt: { gte: filters.start, lt: filters.end },
        changedById: { in: userIds },
        toStatus: { in: ["CANCELLED", "REJECTED"] },
        order: { is: orderAccessWhere },
      },
      _count: { _all: true },
    }),
    db.staffActivityLog.groupBy({
      by: ["actorId"],
      where: {
        restaurantId: membership.restaurantId,
        createdAt: { gte: filters.start, lt: filters.end },
        actorId: { in: userIds },
        ...reportActivityWhere(membership, filters),
      },
      _count: { _all: true },
    }),
    hasRestaurantWideScope(membership, "reports.view") && !filters.branchId
      ? db.priceHistory.groupBy({
        by: ["changedById"],
        where: {
          createdAt: { gte: filters.start, lt: filters.end },
          changedById: { in: userIds },
          product: { is: { restaurantId: membership.restaurantId } },
        },
        _count: { _all: true },
      })
      : Promise.resolve([]),
    db.orderStatusHistory.findMany({
      where: {
        createdAt: { gte: filters.start, lt: filters.end },
        toStatus: "READY",
        changedById: { in: userIds },
        order: { is: { ...orderAccessWhere, status: "COMPLETED", preparingAt: { not: null } } },
      },
      select: { changedById: true, createdAt: true, order: { select: { preparingAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 100_001,
    }),
  ]) : [[], [], [], [], []] as const;

  const createdCounts = new Map(createdOrderGroups.filter((entry) => entry.createdById).map((entry) => [entry.createdById!, entry._count._all]));
  const cancelledCounts = new Map<string, number>();
  const rejectedCounts = new Map<string, number>();
  for (const entry of transitionGroups) {
    if (!entry.changedById) continue;
    const target = entry.toStatus === "CANCELLED" ? cancelledCounts : rejectedCounts;
    target.set(entry.changedById, entry._count._all);
  }
  const activityCounts = countByActor(activityGroups, (entry) => entry.actorId, (entry) => entry._count._all);
  const priceCounts = countByActor(priceGroups, (entry) => entry.changedById, (entry) => entry._count._all);
  const prepDurations = new Map<string, number[]>();
  const sampledReadyEvents = readyEvents.slice(0, 100_000);
  for (const event of sampledReadyEvents) {
    if (!event.changedById) continue;
    const minutes = durationMinutes(event.order.preparingAt, event.createdAt);
    if (minutes === null) continue;
    const values = prepDurations.get(event.changedById) ?? [];
    values.push(minutes);
    prepDurations.set(event.changedById, values);
  }

  const visibleBranchIds = staffBranchIds === null ? null : new Set(staffBranchIds);
  const rows: StaffReportRow[] = sampleMembers.map((member) => {
    const memberBranches = [
      ...(member.branch ? [member.branch] : []),
      ...member.branchAccess.map((entry) => entry.branch),
    ];
    const branchNames = [...new Set(memberBranches
      .filter((branch) => visibleBranchIds === null || visibleBranchIds.has(branch.id))
      .map((branch) => branch.name))];
    return {
      userId: member.userId,
      name: member.user.name,
      roles: member.roles.map((entry) => entry.role),
      branches: branchNames,
      ordersCreated: createdCounts.get(member.userId) ?? 0,
      averagePreparationMinutes: roundTo(average(prepDurations.get(member.userId) ?? [])),
      readyEvents: prepDurations.get(member.userId)?.length ?? 0,
      cancelledOperations: cancelledCounts.get(member.userId) ?? 0,
      rejectedOperations: rejectedCounts.get(member.userId) ?? 0,
      priceChanges: priceCounts.get(member.userId) ?? 0,
      activityEvents: activityCounts.get(member.userId) ?? 0,
    };
  }).sort((a, b) => b.ordersCreated - a.ordersCreated || a.name.localeCompare(b.name));

  return {
    rows,
    priceChangesAvailable: hasRestaurantWideScope(membership, "reports.view") && !filters.branchId,
    preparationSampled: readyEvents.length > 100_000,
    memberListCapped: members.length > 10_000,
  };
}
