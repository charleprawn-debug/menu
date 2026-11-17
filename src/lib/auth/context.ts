import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { effectivePermissions } from "@/lib/permissions";
import { getAuth, RESTAURANT_COOKIE, type AuthContext } from "./session";

export interface ActiveMembership {
  id: string;
  restaurantId: string;
  userId: string;
  title: string | null;
  isOwner: boolean;
  branchId: string | null;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    coverUrl: string | null;
    currency: string;
    timezone: string;
    defaultLocale: string;
    status: string;
    onboardingCompletedAt: Date | null;
    primaryColor: string;
    secondaryColor: string;
  };
  branch: { id: string; name: string } | null;
  roles: { id: string; key: string; name: string; nameEn: string | null }[];
  permissions: Set<string>;
}

/** Resolves the active restaurant for the signed-in user (cookie + membership check). */
export const getActiveMembership = cache(async (): Promise<ActiveMembership | null> => {
  const auth = await getAuth();
  if (!auth) return null;

  const store = await cookies();
  const slug = store.get(RESTAURANT_COOKIE)?.value;

  const memberships = await db.restaurantMember.findMany({
    where: { userId: auth.user.id, status: "ACTIVE", restaurant: { deletedAt: null } },
    include: {
      restaurant: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          coverUrl: true,
          currency: true,
          timezone: true,
          defaultLocale: true,
          status: true,
          onboardingCompletedAt: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
      branch: { select: { id: true, name: true } },
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: { select: { key: true } } } },
            },
          },
        },
      },
      permissions: {
        include: { permission: { select: { key: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const membership = memberships.find((m) => m.restaurant.slug === slug) ?? memberships[0];

  const permissions = effectivePermissions({
    roles: membership.roles.map((r) => ({
      role: { permissions: r.role.permissions.map((p) => ({ permission: { key: p.permission.key } })) },
    })),
    permissions: membership.permissions.map((p) => ({
      effect: p.effect as "ALLOW" | "DENY",
      permission: { key: p.permission.key },
    })),
  });

  return {
    id: membership.id,
    restaurantId: membership.restaurantId,
    userId: membership.userId,
    title: membership.title,
    isOwner: membership.isOwner,
    branchId: membership.branchId,
    restaurant: membership.restaurant,
    branch: membership.branch,
    roles: membership.roles.map((r) => ({
      id: r.role.id,
      key: r.role.key,
      name: r.role.name,
      nameEn: r.role.nameEn,
    })),
    permissions,
  };
});

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireRestaurant(permission?: string): Promise<ActiveMembership & { auth: AuthContext }> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const membership = await getActiveMembership();
  if (!membership) redirect("/onboarding");
  if (permission && !membership.permissions.has(permission) && !membership.isOwner) {
    redirect("/app/forbidden");
  }
  return { ...membership, auth };
}

export async function requirePlatformAdmin(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login?next=/admin");
  if (!auth.user.isPlatformAdmin) redirect("/app/dashboard");
  return auth;
}

/** Non-redirecting permission check for conditional rendering. */
export async function can(permission: string): Promise<boolean> {
  const membership = await getActiveMembership();
  if (!membership) return false;
  return membership.isOwner || membership.permissions.has(permission);
}

export function assertPermission(membership: ActiveMembership, permission: string): void {
  if (!membership.isOwner && !membership.permissions.has(permission)) {
    throw new Error("FORBIDDEN");
  }
}
