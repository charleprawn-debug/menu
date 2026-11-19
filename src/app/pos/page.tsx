import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { Prisma } from "@prisma/client";
import { branchScopeWhere, branchScopesWhere, hasRestaurantWideScope, ownedOrderWhere } from "@/lib/auth/scope";
import { assertPlanFeature } from "@/lib/services/subscription";
import { OperationsShell } from "@/components/operations/operations-shell";
import { PosWorkspace } from "@/components/operations/pos-workspace";

export const metadata: Metadata = { title: "نقطة البيع | DineFlow" };
type SearchParams = Promise<{ table?: string | string[] }>;

export default async function PosPage({ searchParams }: { searchParams: SearchParams }) {
  const membership = await requireRestaurant("pos.use");
  const { locale } = await getI18n();
  try {
    await assertPlanFeature(membership.restaurantId, "pos");
  } catch (error) {
    if (error instanceof Error && ["PLAN_FEATURE_REQUIRED", "SUBSCRIPTION_ACCESS_REQUIRED"].includes(error.message)) redirect("/app/subscription");
    throw error;
  }
  const params = await searchParams;
  const requestedTable = Array.isArray(params.table) ? params.table[0] : params.table;
  const canViewCustomers = (membership.isOwner || membership.permissions.has("customers.view")) && hasRestaurantWideScope(membership, "customers.view");
  const canViewOrders = membership.isOwner || membership.permissions.has("orders.view");
  const canCreateOrders = membership.isOwner || membership.permissions.has("orders.create");
  const orderReadScope: Prisma.OrderWhereInput = {
    ...branchScopeWhere(membership, "orders.view", "branchId"),
    ...ownedOrderWhere(membership, "orders.view"),
  };
  const orderCreateScope: Prisma.OrderWhereInput = {
    ...branchScopeWhere(membership, "orders.create", "branchId"),
    ...ownedOrderWhere(membership, "orders.create"),
  };
  const tablePermissions = [
    ...(membership.isOwner || membership.permissions.has("tables.view") ? ["tables.view"] : []),
    ...(canCreateOrders ? ["orders.create"] : []),
  ];
  const tableWhere: Prisma.TableWhereInput = {
    restaurantId: membership.restaurantId,
    isActive: true,
    ...branchScopesWhere(membership, tablePermissions, "branchId"),
    ...(tablePermissions.some((permission) => membership.permissionScopes.get(permission) === "OWNED") ? { id: { in: [] } } : {}),
  };
  const [products, tables, customers, orders, drafts] = await Promise.all([
    db.product.findMany({
      where: { restaurantId: membership.restaurantId, deletedAt: null, isVisible: true, availability: "ALWAYS" },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], take: 300,
      select: { id: true, nameAr: true, nameEn: true, price: true, imageUrl: true, category: { select: { id: true, nameAr: true, nameEn: true } }, modifierGroups: { select: { group: { select: { id: true, nameAr: true, isRequired: true, isMultiple: true, minSelect: true, maxSelect: true, options: { where: { isAvailable: true }, select: { id: true, nameAr: true, priceDelta: true } } } } } }, extras: { where: { extra: { isActive: true } }, select: { extra: { select: { id: true, nameAr: true, price: true } } } } },
    }),
    db.table.findMany({ where: tableWhere, orderBy: { number: "asc" }, select: { id: true, number: true, name: true, status: true } }),
    canViewCustomers ? db.customer.findMany({ where: { restaurantId: membership.restaurantId }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, name: true, phone: true } }) : Promise.resolve([]),
    canViewOrders ? db.order.findMany({
      where: { restaurantId: membership.restaurantId, source: { not: "DRAFT" }, ...orderReadScope }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, orderNumber: true, type: true, status: true, source: true, createdAt: true, customerName: canViewCustomers, subtotal: true, discount: true, tax: true, serviceFee: true, deliveryFee: true, tip: true, total: true, currency: true, paymentStatus: true, table: { select: { number: true, name: true } }, items: { select: { id: true, nameSnapshot: true, quantity: true, unitPrice: true, modifiersTotal: true, lineTotal: true, taxRate: true, notes: true, modifiers: { select: { groupName: true, name: true } } } }, payments: { orderBy: { createdAt: "asc" }, select: { id: true, amount: true, method: true, createdAt: true } }, invoice: { select: { id: true, invoiceNumber: true, status: true, paidAmount: true } } },
    }) : Promise.resolve([]),
    canCreateOrders ? db.order.findMany({
      where: { restaurantId: membership.restaurantId, source: "DRAFT", ...orderCreateScope }, orderBy: { updatedAt: "desc" }, take: 50,
      select: { id: true, orderNumber: true, type: true, tableId: true, customerId: canViewCustomers, customerName: canViewCustomers, customerPhone: canViewCustomers, notes: true, discount: true, couponCode: true, createdAt: true, items: { select: { productId: true, quantity: true, notes: true, modifiers: { select: { optionId: true, groupName: true } } } } },
    }) : Promise.resolve([]),
  ]);
  const serializedProducts = products.map((product) => ({ ...product, price: product.price.toString(), modifierGroups: product.modifierGroups.map((link) => ({ ...link.group, options: link.group.options.map((option) => ({ ...option, priceDelta: option.priceDelta.toString() })) })), extras: product.extras.map((link) => ({ ...link.extra, price: link.extra.price.toString() })) }));
  const serializedCustomers = customers.map((customer) => ({ id: customer.id, name: customer.name || (locale === "ar" ? "عميل" : "Customer"), phone: customer.phone }));
  const serializedOrders = orders.map((order) => ({
    ...order,
    subtotal: order.subtotal.toString(), discount: order.discount.toString(), tax: order.tax.toString(), serviceFee: order.serviceFee.toString(), deliveryFee: order.deliveryFee.toString(), tip: order.tip.toString(), total: order.total.toString(), createdAt: order.createdAt.toISOString(),
    payments: order.payments.map((payment) => ({ ...payment, amount: payment.amount.toString(), createdAt: payment.createdAt.toISOString() })),
    invoice: order.invoice ? { ...order.invoice, paidAmount: order.invoice.paidAmount.toString() } : null,
    items: order.items.map((item) => ({ ...item, unitPrice: item.unitPrice.toString(), modifiersTotal: item.modifiersTotal.toString(), lineTotal: item.lineTotal.toString(), taxRate: item.taxRate.toString() })),
  }));
  const serializedDrafts = drafts.map((draft) => ({ ...draft, discount: draft.discount.toString(), createdAt: draft.createdAt.toISOString() }));
  return <OperationsShell locale={locale} restaurantName={membership.restaurant.name} activePath="/pos" permissions={[...membership.permissions]} isOwner={membership.isOwner}>
    <PosWorkspace locale={locale} restaurantName={membership.restaurant.name} products={serializedProducts} tables={tables} customers={serializedCustomers} orders={serializedOrders} drafts={serializedDrafts} currency={membership.restaurant.currency} permissions={[...membership.permissions]} isOwner={membership.isOwner} defaultTableId={requestedTable ?? ""} canCreateOrders={canCreateOrders} canViewCustomers={canViewCustomers} />
  </OperationsShell>;
}
