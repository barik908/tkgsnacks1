import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderStatusHistory,
  customers,
  restaurants,
  deliveryBoys,
  notifications,
  cashLedger,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PLACED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: ["PICKED_UP"],
  PICKED_UP: ["ON_THE_WAY"],
  ON_THE_WAY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

const statusSchema = z.object({
  status: z.enum([
    "PLACED",
    "ACCEPTED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "ON_THE_WAY",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
  ]),
  note: z.string().optional(),
  rejectionReason: z.string().optional(),
  cancelReason: z.string().optional(),
  deliveryBoyId: z.number().int().positive().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) return apiError("Invalid order ID", 400);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return apiError("Order not found", 404);

    // Check access
    if (session.role === "CUSTOMER") {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, session.userId))
        .limit(1);
      if (!customer || order.customerId !== customer.id) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, order.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role === "DELIVERY_BOY") {
      const [dboy] = await db
        .select()
        .from(deliveryBoys)
        .where(eq(deliveryBoys.userId, session.userId))
        .limit(1);
      if (!dboy || order.deliveryBoyId !== dboy.id) {
        return apiError("Forbidden", 403);
      }
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId));

    return apiResponse({ ...order, items, history });
  } catch (err) {
    console.error("Order GET error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) return apiError("Invalid order ID", 400);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return apiError("Order not found", 404);

    // Role-based access checks
    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, order.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role === "DELIVERY_BOY") {
      const [dboy] = await db
        .select()
        .from(deliveryBoys)
        .where(eq(deliveryBoys.userId, session.userId))
        .limit(1);
      if (!dboy || order.deliveryBoyId !== dboy.id) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role === "CUSTOMER") {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, session.userId))
        .limit(1);
      if (!customer || order.customerId !== customer.id) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const { status: newStatus, note, rejectionReason, cancelReason, deliveryBoyId } = parsed.data;

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return apiError(`Cannot transition from ${order.status} to ${newStatus}`, 400);
    }

    // Customers can only cancel
    if (session.role === "CUSTOMER" && newStatus !== "CANCELLED") {
      return apiError("Customers can only cancel orders", 403);
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (cancelReason) updateData.cancelReason = cancelReason;
    if (newStatus === "DELIVERED") updateData.actualDeliveryTime = new Date();
    if (deliveryBoyId && session.role === "ADMIN") updateData.deliveryBoyId = deliveryBoyId;

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Record status history
    await db.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: newStatus,
      changedById: session.userId,
      changedByRole: session.role as "CUSTOMER" | "RESTAURANT_OWNER" | "DELIVERY_BOY" | "ADMIN",
      note: note,
    });

    // If DELIVERED + COD, record cash collection
    if (newStatus === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY" && order.deliveryBoyId) {
      await db.insert(cashLedger).values({
        deliveryBoyId: order.deliveryBoyId,
        orderId: order.id,
        type: "COLLECTED",
        amount: order.total,
        note: `Cash collected for order #${order.orderNumber}`,
        recordedById: session.userId,
      });

      await db
        .update(deliveryBoys)
        .set({
          totalDeliveries: sql`${deliveryBoys.totalDeliveries} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(deliveryBoys.id, order.deliveryBoyId));
    }

    // Notify customer
    const [cust] = await db
      .select({ userId: customers.userId })
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1);

    if (cust) {
      const statusMessages: Record<string, string> = {
        ACCEPTED: "আপনার অর্ডার গ্রহণ করা হয়েছে",
        PREPARING: "আপনার খাবার তৈরি হচ্ছে",
        READY_FOR_PICKUP: "খাবার পিকআপের জন্য প্রস্তুত",
        PICKED_UP: "ডেলিভারি বয় পিকআপ করেছে",
        ON_THE_WAY: "ডেলিভারি বয় পথে আছে",
        DELIVERED: "অর্ডার সফলভাবে ডেলিভারি হয়েছে!",
        CANCELLED: "অর্ডার বাতিল করা হয়েছে",
        REJECTED: "দুঃখিত, অর্ডার প্রত্যাখ্যাত হয়েছে",
      };
      const msg = statusMessages[newStatus];
      if (msg) {
        await db.insert(notifications).values({
          userId: cust.userId,
          title: `অর্ডার #${order.orderNumber}`,
          body: msg,
          type: "ORDER_STATUS",
          data: { orderId: order.id, orderNumber: order.orderNumber, status: newStatus },
        });
      }
    }

    return apiResponse(updated, "Order status updated");
  } catch (err) {
    console.error("Order PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}
