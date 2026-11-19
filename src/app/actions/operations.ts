"use server";

import { Prisma, type KitchenStationType, type OrderItemStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { logActivity } from "@/lib/audit";
import { deriveTicketStatus } from "@/lib/services/kitchen";
import { assertPlanFeature } from "@/lib/services/subscription";

const value = (form: FormData, key: string) => {
  const entry = form.get(key);
  return typeof entry === "string" ? entry.trim() : "";
};
const fail = (code: string): never => { throw new Error(code); };
const refreshOperations = () => {
  revalidatePath("/kitchen");
  revalidatePath("/waiter");
  revalidatePath("/pos");
  revalidatePath("/app/orders");
  revalidatePath("/app/tables");
};
async function authorized(permission: string) {
  const member = await requireRestaurant();
  if (!member.isOwner && !member.permissions.has(permission)) fail("FORBIDDEN");
  const feature = permission.startsWith("kitchen.") ? "kitchen_display" : permission === "waiter.use" ? "table_management" : null;
  if (feature) await assertPlanFeature(member.restaurantId, feature);
  return member;
}

export async function startKitchenTicketAction(form: FormData) {
  const member = await authorized("kitchen.manage");
  const id = value(form, "ticketId");
  const ticket = await db.kitchenTicket.findFirst({
    where: { id, order: { restaurantId: member.restaurantId } },
    include: { order: true, items: { include: { orderItem: true } } },
  });
  if (!ticket) fail("NOT_FOUND");
  const safeTicket = ticket!;
  if (!["QUEUED", "DELAYED", "PREPARING"].includes(safeTicket.status)) fail("INVALID_TICKET_TRANSITION");
  if (safeTicket.status === "PREPARING") return;
  await db.$transaction(async (tx) => {
    const changed = await tx.kitchenTicket.updateMany({
      where: { id, order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } }, status: { in: ["QUEUED", "DELAYED"] } },
      data: { status: "PREPARING", startedAt: safeTicket.startedAt ?? new Date(), note: null },
    });
    if (changed.count === 0 && safeTicket.status !== "PREPARING") fail("TICKET_CHANGED");
    await tx.kitchenTicketItem.updateMany({ where: { ticketId: id, status: { in: ["QUEUED", "DELAYED"] } }, data: { status: "PREPARING" } });
    const itemIds = safeTicket.items.flatMap((item) => item.orderItemId ? [item.orderItemId] : []);
    if (itemIds.length) await tx.orderItem.updateMany({ where: { id: { in: itemIds }, order: { restaurantId: member.restaurantId }, status: "PENDING" }, data: { status: "PREPARING" } });
    if (["NEW", "ACCEPTED"].includes(safeTicket.order.status)) {
      const moved = await tx.order.updateMany({ where: { id: safeTicket.orderId, restaurantId: member.restaurantId, status: safeTicket.order.status }, data: { status: "PREPARING", preparingAt: new Date() } });
      if (moved.count) await tx.orderStatusHistory.create({ data: { orderId: safeTicket.orderId, fromStatus: safeTicket.order.status, toStatus: "PREPARING", changedById: member.auth.user.id, note: "Kitchen started preparation" } });
    }
    await tx.kitchenStatusHistory.create({ data: { ticketId: id, status: "PREPARING", changedById: member.auth.user.id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "kitchen.ticket.started", entity: "KitchenTicket", entityId: id });
  refreshOperations();
}

async function recalculateOrderReadiness(tx: Prisma.TransactionClient, restaurantId: string, orderId: string, actorId: string) {
  const [tickets, order] = await Promise.all([
    tx.kitchenTicket.findMany({ where: { orderId, order: { restaurantId } }, select: { status: true } }),
    tx.order.findFirst({ where: { id: orderId, restaurantId }, select: { status: true } }),
  ]);
  if (!order || tickets.length === 0 || !tickets.every((ticket) => ["READY", "SERVED", "CANCELLED"].includes(ticket.status))) return;
  if (!["NEW", "ACCEPTED", "PREPARING"].includes(order.status)) return;
  const moved = await tx.order.updateMany({ where: { id: orderId, restaurantId, status: order.status }, data: { status: "READY", readyAt: new Date() } });
  if (moved.count) await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: "READY", changedById: actorId, note: "All kitchen stations completed" } });
}

export async function updateKitchenItemAction(form: FormData) {
  const member = await authorized("kitchen.manage");
  const itemId = value(form, "itemId");
  const next = value(form, "status");
  if (next !== "PREPARING" && next !== "READY") fail("INVALID_ITEM_STATUS");
  const ticketItem = await db.kitchenTicketItem.findFirst({
    where: { id: itemId, ticket: { order: { restaurantId: member.restaurantId } } },
    include: { ticket: { include: { order: true } } },
  });
  if (!ticketItem) fail("NOT_FOUND");
  const safeTicketItem = ticketItem!;
  const nextItemStatus: OrderItemStatus = next === "READY" ? "READY" : "PREPARING";
  if (!["QUEUED", "PREPARING", "READY"].includes(safeTicketItem.status)) fail("INVALID_ITEM_TRANSITION");
  if (safeTicketItem.status === next) return;
  await db.$transaction(async (tx) => {
    const changed = await tx.kitchenTicketItem.updateMany({
      where: { id: itemId, ticket: { order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } } }, status: { in: ["QUEUED", "PREPARING"] } },
      data: { status: nextItemStatus },
    });
    if (changed.count === 0 && safeTicketItem.status !== next) fail("ITEM_CHANGED");
    if (safeTicketItem.orderItemId) {
      await tx.orderItem.updateMany({
        where: { id: safeTicketItem.orderItemId, order: { restaurantId: member.restaurantId }, status: { in: ["PENDING", "PREPARING"] } },
        data: { status: nextItemStatus },
      });
    }
    const statuses = (await tx.kitchenTicketItem.findMany({ where: { ticketId: safeTicketItem.ticketId }, select: { status: true } })).map((item) => item.status);
    const ticketStatus = deriveTicketStatus(statuses);
    await tx.kitchenTicket.update({ where: { id: safeTicketItem.ticketId }, data: { status: ticketStatus, readyAt: ticketStatus === "READY" ? new Date() : null, startedAt: ticketStatus !== "QUEUED" ? safeTicketItem.ticket.startedAt ?? new Date() : null } });
    if (ticketStatus !== safeTicketItem.ticket.status) await tx.kitchenStatusHistory.create({ data: { ticketId: safeTicketItem.ticketId, status: ticketStatus, changedById: member.auth.user.id } });
    await recalculateOrderReadiness(tx, member.restaurantId, safeTicketItem.ticket.orderId, member.auth.user.id);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: `kitchen.item.${next.toLowerCase()}`, entity: "KitchenTicketItem", entityId: itemId });
  refreshOperations();
}

export async function markKitchenTicketReadyAction(form: FormData) {
  const member = await authorized("kitchen.manage");
  const id = value(form, "ticketId");
  const ticket = await db.kitchenTicket.findFirst({ where: { id, order: { restaurantId: member.restaurantId } }, include: { items: true } });
  if (!ticket) fail("NOT_FOUND");
  const safeTicket = ticket!;
  if (safeTicket.items.length === 0) fail("EMPTY_TICKET");
  if (!["QUEUED", "PREPARING", "DELAYED", "READY"].includes(safeTicket.status)) fail("INVALID_TICKET_TRANSITION");
  if (safeTicket.status === "READY") return;
  await db.$transaction(async (tx) => {
    await tx.kitchenTicketItem.updateMany({ where: { ticketId: id, ticket: { order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } } }, status: { in: ["QUEUED", "PREPARING", "DELAYED"] } }, data: { status: "READY" } });
    const itemIds = safeTicket.items.flatMap((item) => item.orderItemId ? [item.orderItemId] : []);
    if (itemIds.length) await tx.orderItem.updateMany({ where: { id: { in: itemIds }, order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } }, status: { in: ["PENDING", "PREPARING"] } }, data: { status: "READY" } });
    const ticketChanged = await tx.kitchenTicket.updateMany({ where: { id, order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } }, status: { in: ["QUEUED", "PREPARING", "DELAYED"] } }, data: { status: "READY", readyAt: new Date(), note: null } });
    if (!ticketChanged.count) fail("TICKET_CHANGED");
    await tx.kitchenStatusHistory.create({ data: { ticketId: id, status: "READY", changedById: member.auth.user.id } });
    await recalculateOrderReadiness(tx, member.restaurantId, safeTicket.orderId, member.auth.user.id);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "kitchen.ticket.ready", entity: "KitchenTicket", entityId: id });
  refreshOperations();
}

export async function delayKitchenTicketAction(form: FormData) {
  const member = await authorized("kitchen.manage");
  const id = value(form, "ticketId");
  const reason = value(form, "reason").slice(0, 500);
  if (reason.length < 2) fail("DELAY_REASON_REQUIRED");
  const ticket = await db.kitchenTicket.findFirst({ where: { id, order: { restaurantId: member.restaurantId } } });
  if (!ticket) fail("NOT_FOUND");
  const safeTicket = ticket!;
  if (!["QUEUED", "PREPARING", "DELAYED"].includes(safeTicket.status)) fail("INVALID_TICKET_TRANSITION");
  await db.$transaction(async (tx) => {
    const changed = await tx.kitchenTicket.updateMany({ where: { id, order: { restaurantId: member.restaurantId, status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] } }, status: { in: ["QUEUED", "PREPARING", "DELAYED"] } }, data: { status: "DELAYED", note: reason } });
    if (changed.count !== 1) fail("TICKET_CHANGED");
    await tx.kitchenStatusHistory.create({ data: { ticketId: id, status: "DELAYED", changedById: member.auth.user.id } });
  });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "kitchen.ticket.delayed", entity: "KitchenTicket", entityId: id, newValue: { reason } });
  refreshOperations();
}

export async function createKitchenStationAction(form: FormData) {
  const member = await authorized("kitchen.stations.manage");
  const parsed = z.object({ name: z.string().trim().min(2).max(80), type: z.enum(["KITCHEN", "BAR", "GRILL", "DESSERT", "CUSTOM"]), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).safeParse({ name: value(form, "name"), type: value(form, "type"), color: value(form, "color") || "#0ea5e9" });
  if (!parsed.success) fail("INVALID_STATION");
  const duplicate = await db.kitchenStation.findFirst({ where: { restaurantId: member.restaurantId, name: { equals: parsed.data!.name, mode: "insensitive" } } });
  if (duplicate) fail("STATION_NAME_EXISTS");
  const station = await db.kitchenStation.create({ data: { restaurantId: member.restaurantId, name: parsed.data!.name, type: parsed.data!.type as KitchenStationType, color: parsed.data!.color } });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "kitchen.station.created", entity: "KitchenStation", entityId: station.id });
  refreshOperations();
}

export async function assignProductStationAction(form: FormData) {
  const member = await authorized("kitchen.stations.manage");
  const productId = value(form, "productId");
  const stationId = value(form, "stationId");
  const product = await db.product.findFirst({ where: { id: productId, restaurantId: member.restaurantId, deletedAt: null } });
  if (!product) fail("PRODUCT_NOT_FOUND");
  if (stationId && !(await db.kitchenStation.findFirst({ where: { id: stationId, restaurantId: member.restaurantId, isActive: true } }))) fail("INVALID_STATION");
  await db.product.update({ where: { id: productId }, data: { defaultStationId: stationId || null } });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "kitchen.product.station.updated", entity: "Product", entityId: productId, oldValue: { stationId: product!.defaultStationId }, newValue: { stationId: stationId || null } });
  refreshOperations();
}

export async function requestTableInvoiceAction(form: FormData) {
  const member = await authorized("waiter.use");
  const tableId = value(form, "tableId");
  const table = await db.table.findFirst({ where: { id: tableId, restaurantId: member.restaurantId, isActive: true } });
  if (!table) fail("NOT_FOUND");
  const session = await db.tableSession.findFirst({ where: { tableId, restaurantId: member.restaurantId, status: "OPEN" } });
  if (!session) fail("OPEN_SESSION_REQUIRED");
  const pending = await db.waiterCall.findFirst({ where: { restaurantId: member.restaurantId, tableId, status: "PENDING", type: "BILL" } });
  if (pending) fail("BILL_REQUEST_PENDING");
  const call = await db.waiterCall.create({ data: { restaurantId: member.restaurantId, tableId, type: "BILL", note: "Invoice requested by waiter" } });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "waiter.invoice.requested", entity: "WaiterCall", entityId: call.id });
  refreshOperations();
}

export async function handleWaiterCallAction(form: FormData) {
  const member = await authorized("waiter.use");
  const id = value(form, "callId");
  const changed = await db.waiterCall.updateMany({ where: { id, restaurantId: member.restaurantId, status: "PENDING" }, data: { status: "HANDLED", handledById: member.auth.user.id, handledAt: new Date() } });
  if (changed.count !== 1) fail("CALL_ALREADY_HANDLED");
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "waiter.call.handled", entity: "WaiterCall", entityId: id });
  refreshOperations();
}

export async function openWaiterTableAction(form: FormData) {
  const member = await authorized("waiter.use");
  if (!member.isOwner && !member.permissions.has("tables.sessions.manage")) fail("FORBIDDEN");
  const tableId = value(form, "tableId");
  const guests = z.coerce.number().int().min(1).max(100).safeParse(value(form, "guests") || "1");
  if (!guests.success) fail("INVALID_GUEST_COUNT");
  const table = await db.table.findFirst({ where: { id: tableId, restaurantId: member.restaurantId, isActive: true } });
  if (!table) fail("NOT_FOUND");
  await db.$transaction(async (tx) => {
    const active = await tx.tableSession.findFirst({ where: { tableId, restaurantId: member.restaurantId, status: "OPEN" } });
    if (active) fail("SESSION_ALREADY_OPEN");
    await tx.tableSession.create({ data: { restaurantId: member.restaurantId, tableId, code: randomBytes(18).toString("base64url"), guests: guests.data!, openedById: member.auth.user.id } });
    await tx.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "waiter.table.opened", entity: "Table", entityId: tableId });
  refreshOperations();
}

export async function closeWaiterSessionAction(form: FormData) {
  const member = await authorized("waiter.use");
  if (!member.isOwner && !member.permissions.has("tables.sessions.manage")) fail("FORBIDDEN");
  const sessionId = value(form, "sessionId");
  await db.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({ where: { id: sessionId, restaurantId: member.restaurantId, status: "OPEN" }, include: { orders: { select: { id: true, status: true, paymentStatus: true } } } });
    if (!session) fail("NOT_FOUND");
    const unsettled = session!.orders.filter((order) => {
      const unpaidCancellation = ["CANCELLED", "REJECTED"].includes(order.status) && ["UNPAID", "FAILED", "REFUNDED"].includes(order.paymentStatus);
      return !unpaidCancellation && (!["DELIVERED", "COMPLETED"].includes(order.status) || order.paymentStatus !== "PAID");
    });
    if (unsettled.length) fail("SESSION_HAS_UNSETTLED_ORDERS");
    const closed = await tx.tableSession.updateMany({ where: { id: sessionId, restaurantId: member.restaurantId, status: "OPEN" }, data: { status: "CLOSED", closedAt: new Date(), closedById: member.auth.user.id } });
    if (closed.count !== 1) fail("SESSION_CHANGED");
    await tx.table.update({ where: { id: session!.tableId }, data: { status: "CLEANING" } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: member.restaurantId, actorId: member.auth.user.id, action: "waiter.session.closed", entity: "TableSession", entityId: sessionId });
  refreshOperations();
}
