import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, deliveryBoys, orderStatusHistory, notifications, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  orderId: z.number().int().positive(),
  deliveryBoyId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const { orderId, deliveryBoyId } = parsed.data;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return apiError("Order not found", 404);

    if (!["READY_FOR_PICKUP", "ACCEPTED", "PREPARING"].includes(order.status)) {
      return apiError("Order cannot be assigned at this stage", 400);
    }

    const [dboy] = await db
      .select()
      .from(deliveryBoys)
      .where(and(eq(deliveryBoys.id, deliveryBoyId), eq(deliveryBoys.status, "APPROVED")))
      .limit(1);

    if (!dboy) return apiError("Delivery boy not found or not approved", 404);

    const [updated] = await db
      .update(orders)
      .set({ deliveryBoyId, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      changedById: session.userId,
      changedByRole: "ADMIN",
      note: `Delivery boy assigned: ID ${deliveryBoyId}`,
    });

    // Notify delivery boy
    await db.insert(notifications).values({
      userId: dboy.userId,
      title: "নতুন ডেলিভারি অ্যাসাইন",
      body: `অর্ডার #${order.orderNumber} আপনাকে অ্যাসাইন করা হয়েছে`,
      type: "DELIVERY_ASSIGNED",
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });

    return apiResponse(updated, "Delivery boy assigned");
  } catch (err) {
    console.error("Assign delivery error:", err);
    return apiError("Internal server error", 500);
  }
}
