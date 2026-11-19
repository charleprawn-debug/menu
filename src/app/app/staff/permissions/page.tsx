import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { getLocale } from "@/i18n";
import { PermissionWorkspace } from "@/components/staff/permission-workspace";

export const dynamic = "force-dynamic";

export default async function StaffPermissionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireRestaurant("staff.permissions.manage");
  const locale = await getLocale();
  const groups = new Map(PERMISSION_GROUPS.map((group) => [group.key, locale === "ar" ? group.ar : group.en]));
  const params = await searchParams;
  const memberId = typeof params?.member === "string" ? params.member.slice(0, 100) : "";
  const canManageOverrides = actor.isOwner || actor.permissions.has("staff.permissions.manage");
  const targetScope = branchIdsForPermission(actor, "staff.permissions.manage");
  const memberWhere: Prisma.RestaurantMemberWhereInput = { restaurantId: actor.restaurantId };
  if (!actor.isOwner && actor.permissionScopes.get("staff.permissions.manage") === "BRANCH") {
    const branchIds = targetScope ?? [];
    memberWhere.OR = branchIds.length
      ? [{ branchId: { in: branchIds } }, { branchAccess: { some: { branchId: { in: branchIds } } } }]
      : [{ branchId: "__no_access__" }];
  } else if (!actor.isOwner && actor.permissionScopes.get("staff.permissions.manage") === "OWNED") {
    memberWhere.userId = actor.userId;
  }
  const [roles, members] = await Promise.all([
    db.role.findMany({
      where: { restaurantId: actor.restaurantId },
      include: { permissions: { include: { permission: { select: { key: true } } } }, _count: { select: { members: true } } },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    canManageOverrides ? db.restaurantMember.findMany({
      where: memberWhere,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
      take: 250,
    }) : Promise.resolve([]),
  ]);
  const selected = canManageOverrides && memberId && memberId !== actor.id ? members.find((item) => item.id === memberId) : undefined;
  const overrides = selected ? await db.memberPermission.findMany({ where: { memberId: selected.id }, include: { permission: { select: { key: true } } } }) : [];
  const roleData = roles.map((role) => ({
    id: role.id, key: role.key, name: role.name, nameEn: role.nameEn, description: role.description,
    isSystem: role.isSystem, isDefault: role.isDefault, memberCount: role._count.members,
    permissions: role.permissions.map((item) => ({ key: item.permission.key, scope: item.scope })),
  }));

  return <main className="space-y-6 p-4 md:p-8" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header><a className="text-sm text-emerald-700 underline" href="/app/staff">{locale === "ar" ? "العودة إلى الموظفين" : "Back to employees"}</a><h1 className="mt-2 text-3xl font-bold">{locale === "ar" ? "الصلاحيات والنطاق" : "Permissions and scope"}</h1><p className="mt-2 text-sm text-slate-600">{locale === "ar" ? "تُجمع المنح من الأدوار ثم تُطبّق استثناءات العضو، مع تضييق الوصول حسب الفروع والموارد المسندة." : "Role grants are combined with member overrides, then narrowed by branch and resource ownership."}</p></header>
    <PermissionWorkspace
      locale={locale}
      roles={roleData}
      catalog={PERMISSIONS.map((permission) => ({ key: permission.key, group: groups.get(permission.group) ?? permission.group, labelAr: permission.ar, labelEn: permission.en, isSensitive: !!permission.sensitive }))}
      members={members.filter((item) => item.id !== actor.id).map((item) => ({ id: item.id, name: item.user.name ?? item.user.email, email: item.user.email }))}
      selectedMember={selected ? { id: selected.id, name: selected.user.name ?? selected.user.email, email: selected.user.email } : null}
      overrides={overrides.map((item) => ({ key: item.permission.key, effect: item.effect, scope: item.scope }))}
      canManageOverrides={canManageOverrides}
    />
  </main>;
}
