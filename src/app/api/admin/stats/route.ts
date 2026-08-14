import { db } from "@/db";
import { orders, restaurants, users, deliveryBoys } from "@/db/schema";
import { eq, count, sum, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const [totalOrders] = await db.select({ count: count() }).from(orders);
    const [deliveredOrders] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "DELIVERED"));
    const [revenue] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(eq(orders.status, "DELIVERED"));
    const [totalRestaurants] = await db.select({ count: count() }).from(restaurants);
    const [approvedRestaurants] = await db
      .select({ count: count() })
      .from(restaurants)
      .where(eq(restaurants.status, "APPROVED"));
    const [pendingRestaurants] = await db
      .select({ count: count() })
      .from(restaurants)
      .where(eq(restaurants.status, "PENDING"));
    const [totalCustomers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "CUSTOMER"));
    const [totalDeliveryBoys] = await db
      .select({ count: count() })
      .from(deliveryBoys);
    const [approvedDeliveryBoys] = await db
      .select({ count: count() })
      .from(deliveryBoys)
      .where(eq(deliveryBoys.status, "APPROVED"));
    const [pendingDeliveryBoys] = await db
      .select({ count: count() })
      .from(deliveryBoys)
      .where(eq(deliveryBoys.status, "PENDING"));

    // Active orders (not terminal)
    const [activeOrders] = await db.select({ count: count() }).from(orders).where(
      and(
        eq(orders.status, "PLACED")
      )
    );

    return apiResponse({
      orders: {
        total: totalOrders.count,
        delivered: deliveredOrders.count,
        active: activeOrders.count,
        revenue: revenue.total ?? "0",
      },
      restaurants: {
        total: totalRestaurants.count,
        approved: approvedRestaurants.count,
        pending: pendingRestaurants.count,
      },
      customers: {
        total: totalCustomers.count,
      },
      deliveryBoys: {
        total: totalDeliveryBoys.count,
        approved: approvedDeliveryBoys.count,
        pending: pendingDeliveryBoys.count,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return apiError("Internal server error", 500);
  }
}
