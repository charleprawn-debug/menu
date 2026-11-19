import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { filterNav, dashboardNav } from "@/lib/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { branchRelationWhere, branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const membership = await requireRestaurant();

  if (membership.restaurant.status === "SUSPENDED") {
    redirect("/suspended");
  }

  const [newOrders, pendingCalls, pendingReservations, unreadCount, notifications, memberships, subscription] =
    await Promise.all([
      membership.isOwner || membership.permissions.has("orders.view")
        ? db.order.count({ where: { restaurantId: membership.restaurantId, status: "NEW", ...branchScopeWhere(membership, "orders.view", "branchId"), ...ownedOrderWhere(membership, "orders.view") } })
        : Promise.resolve(0),
      membership.isOwner || membership.permissions.has("waiter.use")
        ? db.waiterCall.count({ where: { restaurantId: membership.restaurantId, status: "PENDING", ...branchRelationWhere(membership, "waiter.use", "table") } })
        : Promise.resolve(0),
      membership.isOwner || membership.permissions.has("reservations.view")
        ? db.reservation.count({ where: { restaurantId: membership.restaurantId, status: "PENDING", ...branchRelationWhere(membership, "reservations.view", "table") } })
        : Promise.resolve(0),
      db.notification.count({ where: { userId: membership.userId, isRead: false, OR: [{ restaurantId: membership.restaurantId }, { restaurantId: null }] } }),
      db.notification.findMany({
        where: { userId: membership.userId, OR: [{ restaurantId: membership.restaurantId }, { restaurantId: null }] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, body: true, createdAt: true, isRead: true },
      }),
      db.restaurantMember.findMany({
        where: { userId: membership.userId, status: "ACTIVE", restaurant: { deletedAt: null } },
        include: { restaurant: { select: { name: true, slug: true, logoUrl: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.subscription.findUnique({
        where: { restaurantId: membership.restaurantId },
        include: { plan: { select: { name: true } } },
      }),
    ]);

  const nav = filterNav(dashboardNav, membership.permissions, membership.isOwner);

  return (
    <AppShell
      nav={nav}
      restaurant={{
        name: membership.restaurant.name,
        slug: membership.restaurant.slug,
        logoUrl: membership.restaurant.logoUrl,
        status: membership.restaurant.status,
        planName: subscription?.plan.name ?? null,
        trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      }}
      restaurants={memberships.map((m) => ({
        name: m.restaurant.name,
        slug: m.restaurant.slug,
        logoUrl: m.restaurant.logoUrl,
      }))}
      user={{
        name: membership.auth.user.name ?? membership.auth.user.email,
        email: membership.auth.user.email,
        avatarUrl: membership.auth.user.avatarUrl,
        isPlatformAdmin: membership.auth.user.isPlatformAdmin,
      }}
      counts={{ orders: newOrders, calls: pendingCalls, reservations: pendingReservations }}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        isRead: n.isRead,
      }))}
      unreadCount={unreadCount}
      canCreateOrder={membership.isOwner || membership.permissions.has("orders.create")}
    >
      {children}
    </AppShell>
  );
}
