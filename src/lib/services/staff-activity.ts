import type { Prisma } from "@prisma/client";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";

export interface StaffActivityFilters {
  actorId?: string;
  branchId?: string;
  action?: string;
  entity?: string;
  q?: string;
  from?: Date;
  toExclusive?: Date;
}

export function buildStaffActivityWhere(member: ActiveMembership, filters: StaffActivityFilters = {}): Prisma.StaffActivityLogWhereInput {
  const where: Prisma.StaffActivityLogWhereInput = { restaurantId: member.restaurantId };
  const conditions: Prisma.StaffActivityLogWhereInput[] = [];
  if (!member.isOwner) {
    const scope = member.permissionScopes.get("staff.activity.view") ?? "RESTAURANT";
    if (scope === "OWNED") where.actorId = member.userId;
    if (scope === "BRANCH") {
      const branches = branchIdsForPermission(member, "staff.activity.view") ?? [];
      conditions.push({ branchId: branches.length ? { in: branches } : "__no_access__" });
      if (filters.branchId && !branches.includes(filters.branchId)) conditions.push({ branchId: "__no_access__" });
    }
  }
  if (filters.branchId) conditions.push({ branchId: filters.branchId });
  if (filters.actorId) conditions.push({ actorId: filters.actorId });
  if (filters.action) conditions.push({ action: { contains: filters.action, mode: "insensitive" } });
  if (filters.entity) conditions.push({ entity: { contains: filters.entity, mode: "insensitive" } });
  if (filters.from || filters.toExclusive) conditions.push({ createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.toExclusive ? { lt: filters.toExclusive } : {}) } });
  if (filters.q) conditions.push({ OR: [
    { action: { contains: filters.q, mode: "insensitive" } },
    { entity: { contains: filters.q, mode: "insensitive" } },
    { entityId: { contains: filters.q, mode: "insensitive" } },
    { description: { contains: filters.q, mode: "insensitive" } },
    { actor: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
    { actor: { is: { email: { contains: filters.q, mode: "insensitive" } } } },
  ] });
  if (conditions.length) where.AND = conditions;
  return where;
}

export function parseDateFilter(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function staffActivityFiltersFromParams(params: URLSearchParams): StaffActivityFilters {
  return {
    actorId: params.get("actor")?.slice(0, 100) || undefined,
    branchId: params.get("branch")?.slice(0, 100) || undefined,
    action: params.get("action")?.trim().slice(0, 100) || undefined,
    entity: params.get("entity")?.trim().slice(0, 100) || undefined,
    q: params.get("q")?.trim().slice(0, 160) || undefined,
    from: parseDateFilter(params.get("from") ?? undefined),
    toExclusive: parseDateFilter(params.get("to") ?? undefined, true),
  };
}
