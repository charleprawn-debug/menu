import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireRestaurant } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { getLocale } from "@/i18n";
import { StaffWorkspace } from "@/components/staff/staff-workspace";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireRestaurant("staff.view");
  const locale = await getLocale();
  const query = (await searchParams)?.q;
  const q = (typeof query === "string" ? query : "").trim().slice(0, 120);
  const branchScope = branchIdsForPermission(member, "staff.view");
  const where: Prisma.RestaurantMemberWhereInput = { restaurantId: member.restaurantId };
  if (member.permissionScopes.get("staff.view") === "OWNED" && !member.isOwner) where.userId = member.userId;
  else if (branchScope && !member.isOwner) {
    where.OR = branchScope.length
      ? [{ branchId: { in: branchScope } }, { branchAccess: { some: { branchId: { in: branchScope } } } }]
      : [{ branchId: "__no_access__" }];
  }
  if (q) {
    const searchFilter: Prisma.RestaurantMemberWhereInput = { OR: [
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: q, mode: "insensitive" } } } },
    ] };
    if (where.OR) where.AND = [searchFilter];
    else Object.assign(where, searchFilter);
  }

  const [memberRows, invitationRows, roles, allBranches] = await Promise.all([
    db.restaurantMember.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, pendingEmail: true, phone: true, status: true, lastLoginAt: true } },
        branch: { select: { id: true, name: true } },
        branchAccess: { include: { branch: { select: { id: true, name: true } } } },
        roles: { include: { role: { select: { id: true, key: true, name: true, nameEn: true, isSystem: true, isDefault: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 250,
    }),
    member.isOwner || member.permissions.has("staff.invite") ? db.staffInvitation.findMany({
      where: {
        restaurantId: member.restaurantId,
        status: { in: ["PENDING", "EXPIRED"] },
        ...(member.isOwner || member.permissionScopes.get("staff.invite") !== "BRANCH"
          ? {}
          : { OR: [
              { branchId: { in: branchIdsForPermission(member, "staff.invite") ?? ["__no_access__"] } },
              { branchAccess: { some: { branchId: { in: branchIdsForPermission(member, "staff.invite") ?? ["__no_access__"] } } } },
            ] }),
      },
      include: { role: { select: { name: true, nameEn: true } }, branch: { select: { id: true, name: true } }, branchAccess: { include: { branch: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }) : Promise.resolve([]),
    db.role.findMany({ where: { restaurantId: member.restaurantId }, select: { id: true, key: true, name: true, nameEn: true }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
    db.branch.findMany({ where: { restaurantId: member.restaurantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const updateBranches = branchIdsForPermission(member, "staff.update");
  const inviteBranches = branchIdsForPermission(member, "staff.invite");
  const visibleInScope = (branchIds: string[], scope: string[] | null) => member.isOwner || scope === null || (branchIds.length > 0 && branchIds.every((id) => scope.includes(id)));
  const members = memberRows.filter((item) => visibleInScope([...new Set([...item.branchAccess.map((entry) => entry.branchId), ...(item.branchId ? [item.branchId] : [])])], branchScope));
  const invitations = invitationRows.filter((item) => visibleInScope([...new Set([...item.branchAccess.map((entry) => entry.branchId), ...(item.branchId ? [item.branchId] : [])])], inviteBranches));
  const branchesFor = (scope: string[] | null) => scope === null ? allBranches : allBranches.filter((branch) => scope.includes(branch.id));
  const createBranchOptions = branchesFor(inviteBranches);
  const updateBranchOptions = branchesFor(updateBranches);

  return (
    <main className="space-y-6 p-4 md:p-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-emerald-700">{locale === "ar" ? "إدارة الوصول" : "Access management"}</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{locale === "ar" ? "الموظفون" : "Employees"}</h1><p className="mt-2 text-sm text-slate-600">{locale === "ar" ? "عضويات المطعم منفصلة عن حساب الدخول العام؛ التعطيل هنا لا يعطل حساب الموظف في مطاعم أخرى." : "Restaurant memberships are separate from global sign-in accounts; deactivating here does not affect other restaurants."}</p></div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {member.isOwner || member.permissions.has("staff.roles.manage") ? <a className="rounded-lg border px-3 py-2 hover:bg-slate-50" href="/app/staff/roles">{locale === "ar" ? "الأدوار" : "Roles"}</a> : null}
          {member.isOwner || member.permissions.has("staff.permissions.manage") ? <a className="rounded-lg border px-3 py-2 hover:bg-slate-50" href="/app/staff/permissions">{locale === "ar" ? "مصفوفة الصلاحيات" : "Permissions"}</a> : null}
          {member.isOwner || member.permissions.has("staff.activity.view") ? <a className="rounded-lg border px-3 py-2 hover:bg-slate-50" href="/app/staff/activity">{locale === "ar" ? "سجل النشاط" : "Activity log"}</a> : null}
        </nav>
      </header>
      <form className="flex max-w-xl gap-2" method="get">
        <input className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" name="q" defaultValue={q} placeholder={locale === "ar" ? "ابحث بالاسم أو البريد أو الهاتف" : "Search name, email or phone"} />
        <button className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white" type="submit">{locale === "ar" ? "بحث" : "Search"}</button>
      </form>
      <StaffWorkspace
        locale={locale}
        members={members.map((item) => ({
          id: item.id, userId: item.userId, name: item.user.name ?? "", email: item.user.email,
          pendingEmail: item.user.pendingEmail, phone: item.user.phone ?? "", status: item.status,
          accountStatus: item.user.status, isOwner: item.isOwner, branchId: item.branchId,
          branchName: item.branch?.name ?? null,
          branchAccess: [...new Map([...item.branchAccess.map((entry) => [entry.branch.id, { id: entry.branch.id, name: entry.branch.name }] as const), ...(item.branch ? [[item.branch.id, { id: item.branch.id, name: item.branch.name }] as const] : [])]).values()],
          roles: item.roles.map((entry) => ({ id: entry.role.id, key: entry.role.key, name: entry.role.name, nameEn: entry.role.nameEn })),
          lastLoginAt: item.user.lastLoginAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        }))}
        invitations={invitations.map((item) => ({
          id: item.id, email: item.email, name: item.name ?? "", status: item.status,
          expiresAt: item.expiresAt.toISOString(), sendCount: item.sendCount,
          roleName: locale === "ar" ? item.role?.name ?? "—" : item.role?.nameEn ?? item.role?.name ?? "—",
          branchNames: [...new Set([...item.branchAccess.map((entry) => entry.branch.name), ...(item.branch?.name ? [item.branch.name] : [])])],
        }))}
        roles={roles.filter((role) => role.key !== "owner")}
        createBranches={createBranchOptions}
        updateBranches={updateBranchOptions}
        canInvite={member.isOwner || member.permissions.has("staff.invite")}
        canUpdate={member.isOwner || member.permissions.has("staff.update")}
        canDelete={member.isOwner || member.permissions.has("staff.delete")}
        canManagePermissions={member.isOwner || member.permissions.has("staff.permissions.manage")}
        canViewActivity={member.isOwner || member.permissions.has("staff.activity.view")}
      />
    </main>
  );
}
