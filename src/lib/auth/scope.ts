import type { ActiveMembership } from "@/lib/auth/context";
import type { PermissionScope } from "@/lib/permissions";

/** Branches the member may operate on; `null` means restaurant-wide access. */
export function branchIdsForPermission(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permission: string,
): string[] | null {
  if (membership.isOwner || membership.permissionScopes.get(permission) === "RESTAURANT") return null;
  const branchIds = new Set(membership.branchId ? [membership.branchId] : []);
  for (const branchId of membership.branchAccessIds) branchIds.add(branchId);
  return [...branchIds];
}

/** Checks an actual resource branch; branch-scoped actors never access branchless rows. */
export function canAccessBranch(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permission: string,
  resourceBranchId: string | null | undefined,
): boolean {
  if (membership.isOwner || membership.permissionScopes.get(permission) === "RESTAURANT") return true;
  if (membership.permissionScopes.get(permission) === "OWNED" || !resourceBranchId) return false;
  return (branchIdsForPermission(membership, permission) ?? []).includes(resourceBranchId);
}

/** True only where the permission explicitly has restaurant-wide scope. */
export function hasRestaurantWideScope(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes">,
  permission: string,
): boolean {
  return membership.isOwner || membership.permissionScopes.get(permission) === "RESTAURANT";
}

/** Generic Prisma-compatible branch predicate for branch-aware models. */
export function branchScopeWhere(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permission: string,
  field = "branchId",
): Record<string, unknown> {
  const scope = membership.permissionScopes.get(permission) ?? "RESTAURANT";
  if (membership.isOwner || scope === "RESTAURANT") return {};
  if (scope === "OWNED") return {};
  const branchIds = branchIdsForPermission(membership, permission) ?? [];
  if (!branchIds.length) return { [field]: "__no_access__" };
  return { [field]: { in: branchIds } };
}

/** Intersects branch grants across all capabilities required by a combined view or action. */
export function branchScopesWhere(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permissions: string[],
  field = "branchId",
): Record<string, unknown> {
  if (membership.isOwner) return {};
  const branchPermissions = permissions.filter((permission) => membership.permissionScopes.get(permission) === "BRANCH");
  if (!branchPermissions.length) return {};
  const sets = branchPermissions.map((permission) => new Set(branchIdsForPermission(membership, permission) ?? []));
  const intersection = [...sets[0]].filter((id) => sets.every((set) => set.has(id)));
  return { [field]: { in: intersection } };
}

/** Branch predicate for models that reach their branch through a relation such as `table`. */
export function branchRelationWhere(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permission: string,
  relation: string,
  field = "branchId",
): Record<string, unknown> {
  return branchRelationsWhere(membership, [permission], relation, field);
}

export function branchRelationsWhere(
  membership: Pick<ActiveMembership, "isOwner" | "permissionScopes" | "branchId" | "branchAccessIds">,
  permissions: string[],
  relation: string,
  field = "branchId",
): Record<string, unknown> {
  if (membership.isOwner) return {};
  if (permissions.some((permission) => membership.permissionScopes.get(permission) === "OWNED")) return { [relation]: { id: { in: [] } } };
  const branchPermissions = permissions.filter((permission) => membership.permissionScopes.get(permission) === "BRANCH");
  if (!branchPermissions.length) return {};
  const sets = branchPermissions.map((permission) => new Set(branchIdsForPermission(membership, permission) ?? []));
  const intersection = [...sets[0]].filter((id) => sets.every((set) => set.has(id)));
  return { [relation]: { [field]: { in: intersection } } };
}

/** Adds the actor/assignee constraint for resources whose scope is OWNED. */
export function ownedOrderWhere(
  membership: Pick<ActiveMembership, "userId" | "id" | "permissionScopes">,
  permission: string,
): Record<string, unknown> {
  if (membership.permissionScopes.get(permission) !== "OWNED") return {};
  return {
    OR: [
      { createdById: membership.userId },
      { driverId: membership.userId },
      { assignments: { some: { memberId: membership.id } } },
    ],
  };
}

export function isPermissionScope(value: unknown): value is PermissionScope {
  return value === "RESTAURANT" || value === "BRANCH" || value === "OWNED";
}
