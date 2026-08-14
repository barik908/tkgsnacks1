import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderStatusHistory,
  menuItems,
  restaurants,
  customers,
  notifications,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { getDeliveryFee } from "@/lib/platform";
import { generateOrderNumber, generateVerificationCode } from "@/lib/auth";
import { z } from "zod";

const orderSchema = z.object({
  restaurantId: z.number().int().positive(),
  items: z.array(
    z.object({
      menuItemId: z.number().int().positive(),
      quantity: z.number().int().min(1),
      specialInstructions: z.string().optional(),
    })
  ).min(1),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(10).max(20),
  deliveryAddress: z.string().min(5),
  deliveryLandmark: z.string().optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "ONLINE"]).default("CASH_ON_DELIVERY"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "CUSTOMER") {
      return apiError("Only customers can place orders", 403);
    }

    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const data = parsed.data;

    // Get customer record
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, session.userId))
      .limit(1);
    if (!customer) return apiError("Customer profile not found", 404);

    // Validate restaurant
    const [rest] = await db
      .select()
      .from(restaurants)
      .where(
        and(
          eq(restaurants.id, data.restaurantId),
          eq(restaurants.status, "APPROVED"),
          eq(restaurants.isVisible, true)
        )
      )
      .limit(1);

    if (!rest) return apiError("Restaurant not available", 404);

    // Validate and price menu items (all must belong to this restaurant)
    let subtotal = 0;
    const resolvedItems: {
      menuItemId: number;
      name: string;
      price: string;
      quantity: number;
      subtotal: string;
      specialInstructions?: string;
    }[] = [];

    for (const orderItem of data.items) {
      const [mi] = await db
        .select()
        .from(menuItems)
        .where(
          and(
            eq(menuItems.id, orderItem.menuItemId),
            eq(menuItems.restaurantId, data.restaurantId),
            eq(menuItems.isAvailable, true)
          )
        )
        .limit(1);

      if (!mi) {
        return apiError(`Menu item ${orderItem.menuItemId} not available`, 400);
      }

      const itemPrice = parseFloat(mi.price);
      const itemSubtotal = itemPrice * orderItem.quantity;
      subtotal += itemSubtotal;

      resolvedItems.push({
        menuItemId: mi.id,
        name: mi.name,
        price: mi.price,
        quantity: orderItem.quantity,
        subtotal: itemSubtotal.toFixed(2),
        specialInstructions: orderItem.specialInstructions,
      });
    }

    // Delivery fee
    const deliveryFee = rest.deliveryFeeOverride
      ? parseFloat(rest.deliveryFeeOverride)
      : await getDeliveryFee(rest.isPartner);

    const total = subtotal + deliveryFee;
    const orderNumber = generateOrderNumber();
    const verificationCode = generateVerificationCode();

    // Create order
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: customer.id,
        restaurantId: data.restaurantId,
        status: "PLACED",
        paymentMethod: data.paymentMethod,
        paymentStatus: "PENDING",
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        deliveryLandmark: data.deliveryLandmark,
        deliveryLatitude: data.deliveryLatitude?.toString(),
        deliveryLongitude: data.deliveryLongitude?.toString(),
        deliveryInstructions: data.deliveryInstructions,
        verificationCode,
      })
      .returning();

    // Create order items
    await db.insert(orderItems).values(
      resolvedItems.map((item) => ({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        specialInstructions: item.specialInstructions,
      }))
    );

    // Create status history
    await db.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      fromStatus: null,
      toStatus: "PLACED",
      changedById: session.userId,
      changedByRole: "CUSTOMER",
      note: "Order placed by customer",
    });

    // Notify restaurant owner
    const [owner] = await db
      .select({ id: restaurants.ownerId })
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId))
      .limit(1);

    if (owner) {
      await db.insert(notifications).values({
        userId: owner.id,
        title: "নতুন অর্ডার",
        body: `অর্ডার #${orderNumber} এসেছে। মোট: ৳${total.toFixed(0)}`,
        type: "NEW_ORDER",
        data: { orderId: newOrder.id, orderNumber },
      });
    }

    return apiResponse(
      {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        total: newOrder.total,
        status: newOrder.status,
        verificationCode: newOrder.verificationCode,
      },
      "Order placed successfully",
      201
    );
  } catch (err) {
    console.error("Order POST error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    let rows;

    if (session.role === "CUSTOMER") {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, session.userId))
        .limit(1);
      if (!customer) return apiError("Customer not found", 404);

      rows = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
          restaurantId: orders.restaurantId,
        })
        .from(orders)
        .where(eq(orders.customerId, customer.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (session.role === "ADMIN") {
      rows = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      return apiError("Forbidden", 403);
    }

    return apiResponse(rows);
  } catch (err) {
    console.error("Orders GET error:", err);
    return apiError("Internal server error", 500);
  }
}
