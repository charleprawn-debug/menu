import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { ensureActiveOrdersKitchenTickets } from "@/lib/services/kitchen-sync";
import { assertPlanFeature } from "@/lib/services/subscription";
import { OperationsShell } from "@/components/operations/operations-shell";
import { KitchenDisplay } from "@/components/operations/kitchen-display";

export const metadata: Metadata = { title: "المطبخ | DineFlow" };

export default async function KitchenPage() {
  const membership = await requireRestaurant("kitchen.view");
  const { locale } = await getI18n();
  try {
    await assertPlanFeature(membership.restaurantId, "kitchen_display");
  } catch (error) {
    if (error instanceof Error && ["PLAN_FEATURE_REQUIRED", "SUBSCRIPTION_ACCESS_REQUIRED"].includes(error.message)) redirect("/app/subscription");
    throw error;
  }
  await ensureActiveOrdersKitchenTickets(membership.restaurantId);
  const canManageStations = membership.isOwner || membership.permissions.has("kitchen.stations.manage");
  const canManageTickets = membership.isOwner || membership.permissions.has("kitchen.manage");
  const [stations, tickets, products] = await Promise.all([
    db.kitchenStation.findMany({
      where: { restaurantId: membership.restaurantId, isActive: true },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, type: true, color: true },
    }),
    db.kitchenTicket.findMany({
      where: {
        order: { restaurantId: membership.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } },
        status: { notIn: ["SERVED", "CANCELLED"] },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 300,
      include: {
        station: { select: { id: true, name: true, type: true, color: true } },
        order: {
          select: {
            id: true, orderNumber: true, type: true, status: true, createdAt: true, notes: true,
            table: { select: { number: true, name: true } },
          },
        },
        items: {
          include: {
            orderItem: { select: { modifiers: { select: { groupName: true, name: true } } } },
          },
        },
      },
    }),
    canManageStations
      ? db.product.findMany({
          where: { restaurantId: membership.restaurantId, deletedAt: null, isVisible: true },
          orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
          select: { id: true, nameAr: true, nameEn: true, defaultStationId: true, category: { select: { nameAr: true } } },
          take: 300,
        })
      : Promise.resolve([]),
  ]);
  const serializedTickets = tickets.map((ticket) => ({
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    startedAt: ticket.startedAt?.toISOString() ?? null,
    readyAt: ticket.readyAt?.toISOString() ?? null,
    order: {
      ...ticket.order,
      createdAt: ticket.order.createdAt.toISOString(),
      items: ticket.items.map((item) => ({
        ...item,
        orderItem: item.orderItem ? { modifiers: item.orderItem.modifiers } : null,
      })),
    },
  }));
  return (
    <OperationsShell locale={locale} restaurantName={membership.restaurant.name} activePath="/kitchen" permissions={[...membership.permissions]} isOwner={membership.isOwner}>
      <KitchenDisplay locale={locale} restaurantName={membership.restaurant.name} tickets={serializedTickets} stations={stations} products={products} canManageStations={canManageStations} canManageTickets={canManageTickets} />
    </OperationsShell>
  );
}
