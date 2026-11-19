import type { KitchenTicketStatus, Prisma } from "@prisma/client";

export type RoutableOrderItem = {
  id: string;
  stationId: string | null;
  product: { defaultStationId: string | null } | null;
};

export function groupItemsByStation<T extends RoutableOrderItem>(
  items: T[],
  allowedStationIds: ReadonlySet<string>,
  fallbackStationId: string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const requested = item.stationId ?? item.product?.defaultStationId ?? null;
    const stationId = requested && allowedStationIds.has(requested) ? requested : fallbackStationId;
    const group = groups.get(stationId) ?? [];
    group.push(item);
    groups.set(stationId, group);
  }
  return groups;
}

export function deriveTicketStatus(statuses: string[]): KitchenTicketStatus {
  if (statuses.length > 0 && statuses.every((status) => status === "READY" || status === "SERVED")) return "READY";
  if (statuses.some((status) => status === "PREPARING")) return "PREPARING";
  if (statuses.some((status) => status === "DELAYED")) return "DELAYED";
  if (statuses.length > 0 && statuses.every((status) => status === "CANCELLED")) return "CANCELLED";
  return "QUEUED";
}

/**
 * Creates one idempotent ticket per order/station and routes every immutable order
 * item to its product station, falling back to the restaurant's main kitchen.
 * Must be called inside the transaction that owns the order.
 */
export async function ensureKitchenTickets(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  orderId: string,
) {
  const order = await tx.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { items: { include: { product: { select: { defaultStationId: true } } } } },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.source === "DRAFT" || ["CANCELLED", "REJECTED", "COMPLETED"].includes(order.status)) return;
  const stations = await tx.kitchenStation.findMany({
    where: { restaurantId, isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true, type: true },
  });
  if (stations.length === 0) throw new Error("KITCHEN_STATION_REQUIRED");
  const allowed = new Set(stations.map((station) => station.id));
  const fallback = stations.find((station) => station.type === "KITCHEN") ?? stations[0];
  const groups = groupItemsByStation(order.items, allowed, fallback.id);

  for (const [stationId, items] of groups) {
    await tx.orderItem.updateMany({
      where: { orderId, id: { in: items.map((item) => item.id) }, stationId: null },
      data: { stationId },
    });
    const ticket = await tx.kitchenTicket.upsert({
      where: { orderId_stationId: { orderId, stationId } },
      create: {
        orderId,
        stationId,
        ticketNumber: order.orderNumber,
        items: {
          create: items.map((item) => ({
            orderItemId: item.id,
            name: order.items.find((candidate) => candidate.id === item.id)!.nameSnapshot,
            quantity: order.items.find((candidate) => candidate.id === item.id)!.quantity,
            notes: order.items.find((candidate) => candidate.id === item.id)!.notes,
          })),
        },
      },
      update: {},
      select: { id: true },
    });
    const existing = await tx.kitchenTicketItem.findMany({
      where: { ticketId: ticket.id, orderItemId: { in: items.map((item) => item.id) } },
      select: { orderItemId: true },
    });
    const existingIds = new Set(existing.map((item) => item.orderItemId));
    const missing = items.filter((item) => !existingIds.has(item.id));
    if (missing.length) {
      await tx.kitchenTicketItem.createMany({
        data: missing.map((item) => ({
          ticketId: ticket.id,
          orderItemId: item.id,
          name: order.items.find((candidate) => candidate.id === item.id)!.nameSnapshot,
          quantity: order.items.find((candidate) => candidate.id === item.id)!.quantity,
          notes: order.items.find((candidate) => candidate.id === item.id)!.notes,
        })),
      });
    }
  }
}
