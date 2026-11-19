import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { Prisma } from "@prisma/client";
import { branchRelationWhere, branchScopeWhere, branchScopesWhere, hasRestaurantWideScope, ownedOrderWhere } from "@/lib/auth/scope";
import { assertPlanFeature } from "@/lib/services/subscription";
import { OperationsShell } from "@/components/operations/operations-shell";
import { WaiterWorkspace } from "@/components/operations/waiter-workspace";

export const metadata: Metadata = { title: "النادل | DineFlow" };

export default async function WaiterPage() {
  const membership = await requireRestaurant("waiter.use");
  const { locale } = await getI18n();
  try {
    await assertPlanFeature(membership.restaurantId, "table_management");
  } catch (error) {
    if (error instanceof Error && ["PLAN_FEATURE_REQUIRED", "SUBSCRIPTION_ACCESS_REQUIRED"].includes(error.message)) redirect("/app/subscription");
    throw error;
  }
  const canCreateOrders = membership.isOwner || membership.permissions.has("orders.create");
  const canViewCustomers = (membership.isOwner || membership.permissions.has("customers.view")) && hasRestaurantWideScope(membership, "customers.view");
  const canManageSessions = membership.isOwner || membership.permissions.has("tables.sessions.manage");
  const canChangeOrderStatus = membership.isOwner || membership.permissions.has("orders.change_status");
  const canViewOrderDetails = membership.isOwner || membership.permissions.has("orders.view");
  const orderPermissions = ["waiter.use", ...(canViewOrderDetails ? ["orders.view"] : [])];
  const ownedPermission = orderPermissions.find((permission) => membership.permissionScopes.get(permission) === "OWNED");
  const ordersWhere: Prisma.OrderWhereInput = {
    restaurantId: membership.restaurantId,
    status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY", "DELIVERED"] },
    ...branchScopesWhere(membership, orderPermissions, "branchId"),
    ...(ownedPermission ? ownedOrderWhere(membership, ownedPermission) : {}),
  };
  const tablePermissions = ["waiter.use", ...(membership.isOwner || membership.permissions.has("tables.view") ? ["tables.view"] : []), ...(canManageSessions ? ["tables.sessions.manage"] : [])];
  const tablesWhere: Prisma.TableWhereInput = {
    restaurantId: membership.restaurantId,
    isActive: true,
    ...branchScopesWhere(membership, tablePermissions, "branchId"),
    ...(tablePermissions.some((permission) => membership.permissionScopes.get(permission) === "OWNED") ? { id: { in: [] } } : {}),
  };
  const [tables, orders, calls, products, customers] = await Promise.all([
    db.table.findMany({
      where: tablesWhere, orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, seats: true, status: true, sessions: { where: { status: "OPEN" }, orderBy: { openedAt: "desc" }, take: 1, select: { id: true, guests: true, openedAt: true } } },
    }),
    canViewOrderDetails ? db.order.findMany({ where: ordersWhere, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, orderNumber: true, type: true, status: true, source: true, createdAt: true, table: { select: { number: true, name: true } }, items: { select: { id: true, nameSnapshot: true, quantity: true, status: true } } } }) : Promise.resolve([]),
    db.waiterCall.findMany({ where: { restaurantId: membership.restaurantId, status: "PENDING", ...branchRelationWhere(membership, "waiter.use", "table") }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, type: true, note: true, createdAt: true, table: { select: { id: true, number: true, name: true } } } }),
    canCreateOrders ? db.product.findMany({ where: { restaurantId: membership.restaurantId, deletedAt: null, isVisible: true, availability: "ALWAYS" }, orderBy: { sortOrder: "asc" }, take: 250, select: { id: true, nameAr: true, nameEn: true, price: true, imageUrl: true, defaultStationId: true, category: { select: { id: true, nameAr: true, nameEn: true } }, modifierGroups: { select: { group: { select: { id: true, nameAr: true, isRequired: true, isMultiple: true, minSelect: true, maxSelect: true, options: { where: { isAvailable: true }, select: { id: true, nameAr: true, priceDelta: true } } } } } }, extras: { where: { extra: { isActive: true } }, select: { extra: { select: { id: true, nameAr: true, price: true } } } } } }) : Promise.resolve([]),
    canCreateOrders && canViewCustomers ? db.customer.findMany({ where: { restaurantId: membership.restaurantId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, phone: true } }) : Promise.resolve([]),
  ]);
  const serializedTables = tables.map((table) => ({ ...table, sessionId: table.sessions[0]?.id ?? null, sessionGuests: table.sessions[0]?.guests ?? null, openedAt: table.sessions[0]?.openedAt.toISOString() ?? null }));
  const serializedProducts = products.map((product) => ({ ...product, price: product.price.toString(), category: product.category, modifierGroups: product.modifierGroups.map((link) => ({ ...link.group, options: link.group.options.map((option) => ({ ...option, priceDelta: option.priceDelta.toString() })) })), extras: product.extras.map((link) => ({ ...link.extra, price: link.extra.price.toString() })) }));
  const serializedCustomers = customers.map((customer) => ({ id: customer.id, name: customer.name || (locale === "ar" ? "عميل" : "Customer"), phone: customer.phone }));
  return <OperationsShell locale={locale} restaurantName={membership.restaurant.name} activePath="/waiter" permissions={[...membership.permissions]} isOwner={membership.isOwner}>
    <WaiterWorkspace locale={locale} restaurantName={membership.restaurant.name} tables={serializedTables} orders={orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }))} calls={calls.map((call) => ({ ...call, createdAt: call.createdAt.toISOString() }))} products={serializedProducts} customers={serializedCustomers} currency={membership.restaurant.currency} canDiscount={membership.isOwner || membership.permissions.has("orders.discount")} canCreateOrders={canCreateOrders} canManageSessions={canManageSessions} canChangeOrderStatus={canChangeOrderStatus} canViewOrderDetails={canViewOrderDetails} canViewCustomers={canViewCustomers}/>
  </OperationsShell>;
}
