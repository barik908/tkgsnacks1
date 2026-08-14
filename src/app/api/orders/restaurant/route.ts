import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, restaurants, customers, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const [rest] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.ownerId, session.userId))
      .limit(1);

    if (!rest) return apiError("Restaurant not found", 404);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.restaurantId, rest.id)];

    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        deliveryLandmark: orders.deliveryLandmark,
        deliveryInstructions: orders.deliveryInstructions,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.restaurantId, rest.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter by status if provided
    const filtered = status
      ? rows.filter((o) => o.status === status)
      : rows;

    // Add items for each order
    const withItems = await Promise.all(
      filtered.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );

    return apiResponse(withItems);
  } catch (err) {
    console.error("Restaurant orders GET error:", err);
    return apiError("Internal server error", 500);
  }
}
