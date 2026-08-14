import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, deliveryBoys, restaurants } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "DELIVERY_BOY" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const [dboy] = await db
      .select()
      .from(deliveryBoys)
      .where(eq(deliveryBoys.userId, session.userId))
      .limit(1);

    if (!dboy) return apiError("Delivery boy profile not found", 404);
    if (dboy.status !== "APPROVED") return apiError("Your account is not approved yet", 403);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "assigned"; // assigned | available

    let rows;
    if (type === "available") {
      // Unassigned READY_FOR_PICKUP orders
      rows = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, "READY_FOR_PICKUP"),
            isNull(orders.deliveryBoyId)
          )
        )
        .orderBy(desc(orders.createdAt));
    } else {
      // Orders assigned to this delivery boy
      rows = await db
        .select()
        .from(orders)
        .where(eq(orders.deliveryBoyId, dboy.id))
        .orderBy(desc(orders.createdAt));
    }

    const withItems = await Promise.all(
      rows.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        const [rest] = await db
          .select({ name: restaurants.name, address: restaurants.address, phone: restaurants.phone })
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);
        return { ...order, items, restaurant: rest };
      })
    );

    return apiResponse(withItems);
  } catch (err) {
    console.error("Delivery orders GET error:", err);
    return apiError("Internal server error", 500);
  }
}
