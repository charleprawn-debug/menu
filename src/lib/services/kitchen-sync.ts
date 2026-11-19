import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ensureKitchenTickets } from "@/lib/services/kitchen";

export async function ensureActiveOrdersKitchenTickets(restaurantId: string) {
  const orders = await db.order.findMany({
    where: {
      restaurantId,
      source: { not: "DRAFT" },
      status: { in: ["NEW", "ACCEPTED", "PREPARING"] },
      kitchenTickets: { none: {} },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true },
  });
  for (const order of orders) {
    try {
      await db.$transaction((tx) => ensureKitchenTickets(tx, restaurantId, order.id), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Error && error.message === "KITCHEN_STATION_REQUIRED") continue;
      throw error;
    }
  }
}
