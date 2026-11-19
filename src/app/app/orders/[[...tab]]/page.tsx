import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { branchIdsForPermission, branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { getI18n } from "@/i18n";
import { OrdersWorkspace } from "@/components/orders/orders-workspace";

export const metadata: Metadata = { title: "الطلبات | DineFlow" };

export default async function OrdersPage({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  const member = await requireRestaurant("orders.view");
  const { locale } = await getI18n();
  const restaurantId = member.restaurantId;
  const orderWhere: Prisma.OrderWhereInput = {
    restaurantId,
    ...branchScopeWhere(member, "orders.view", "branchId"),
    ...ownedOrderWhere(member, "orders.view"),
  };
  const tablePermission = member.permissions.has("tables.view")
    ? "tables.view"
    : member.permissions.has("orders.change_status")
      ? "orders.change_status"
      : "orders.create";
  const tableBranchIds = branchIdsForPermission(member, tablePermission);
  const tableWhere: Prisma.TableWhereInput = {
    restaurantId,
    isActive: true,
    ...(tableBranchIds === null ? {} : { branchId: { in: tableBranchIds } }),
  };
  const [orders, tables, products, restaurant] = await Promise.all([
    db.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        table: { select: { number: true, name: true } },
        session: { select: { id: true, code: true } },
        items: { include: { modifiers: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        notesList: { orderBy: { createdAt: "desc" } },
        payments: true,
      },
    }),
    db.table.findMany({ where: tableWhere, select: { id: true, number: true, name: true, status: true }, orderBy: { number: "asc" } }),
    db.product.findMany({
      where: { restaurantId, deletedAt: null, isVisible: true, availability: "ALWAYS" },
      select: {
        id: true, nameAr: true, nameEn: true, price: true, taxRate: true, imageUrl: true,
        modifierGroups: { select: { group: { select: { id: true, nameAr: true, options: { where: { isAvailable: true }, select: { id: true, nameAr: true, priceDelta: true } } } } } },
        extras: { select: { extra: { select: { id: true, nameAr: true, price: true } } } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.restaurant.findFirst({ where: { id: restaurantId }, select: { orderSettings: true } }),
  ]);
  const serializedOrders = orders.map((order) => ({
    ...order,
    subtotal: order.subtotal.toString(), discount: order.discount.toString(), tax: order.tax.toString(),
    serviceFee: order.serviceFee.toString(), deliveryFee: order.deliveryFee.toString(), tip: order.tip.toString(),
    total: order.total.toString(), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null, preparingAt: order.preparingAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null, deliveredAt: order.deliveredAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null, cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      ...item, unitPrice: item.unitPrice.toString(), modifiersTotal: item.modifiersTotal.toString(),
      lineTotal: item.lineTotal.toString(), taxRate: item.taxRate.toString(), createdAt: item.createdAt.toISOString(),
      modifiers: item.modifiers.map((modifier) => ({ ...modifier, priceDelta: modifier.priceDelta.toString() })),
    })),
    statusHistory: order.statusHistory.map((history) => ({ ...history, createdAt: history.createdAt.toISOString() })),
    notesList: order.notesList.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
    payments: order.payments.map((payment) => ({ ...payment, amount: payment.amount.toString(), createdAt: payment.createdAt.toISOString() })),
  }));
  const serializedProducts = products.map((product) => ({
    ...product,
    price: product.price.toString(),
    taxRate: product.taxRate.toString(),
    modifierGroups: product.modifierGroups.map((link) => ({
      ...link.group,
      options: link.group.options.map((option) => ({ ...option, priceDelta: option.priceDelta.toString() })),
    })),
    extras: product.extras.map((link) => ({ ...link.extra, price: link.extra.price.toString() })),
  }));
  const orderSettings = restaurant?.orderSettings && typeof restaurant.orderSettings === "object" && !Array.isArray(restaurant.orderSettings)
    ? restaurant.orderSettings as Record<string, unknown>
    : {};
  return (
    <OrdersWorkspace
      locale={locale}
      activeTab={tab?.[0] ?? "all"}
      permissions={[...member.permissions]}
      isOwner={member.isOwner}
      orders={serializedOrders}
      tables={tables}
      products={serializedProducts}
      orderSettings={orderSettings}
      currency={member.restaurant.currency}
    />
  );
}
