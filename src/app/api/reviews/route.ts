import { NextRequest } from "next/server";
import { db } from "@/db";
import { reviews, orders, customers, restaurants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  orderId: z.number().int().positive(),
  foodRating: z.number().int().min(1).max(5),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CUSTOMER") {
      return apiError("Only customers can submit reviews", 403);
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, session.userId))
      .limit(1);
    if (!customer) return apiError("Customer not found", 404);

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, parsed.data.orderId),
          eq(orders.customerId, customer.id),
          eq(orders.status, "DELIVERED")
        )
      )
      .limit(1);

    if (!order) return apiError("Order not found or not delivered", 404);

    // Check no existing review
    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.orderId, order.id))
      .limit(1);

    if (existing) return apiError("You have already reviewed this order", 409);

    const [review] = await db
      .insert(reviews)
      .values({
        orderId: order.id,
        customerId: customer.id,
        restaurantId: order.restaurantId,
        foodRating: parsed.data.foodRating,
        deliveryRating: parsed.data.deliveryRating,
        comment: parsed.data.comment,
      })
      .returning();

    // Update restaurant avg rating
    const allReviews = await db
      .select({ rating: reviews.foodRating })
      .from(reviews)
      .where(eq(reviews.restaurantId, order.restaurantId));

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db
      .update(restaurants)
      .set({
        avgRating: avgRating.toFixed(2),
        totalReviews: allReviews.length,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, order.restaurantId));

    return apiResponse(review, "Review submitted", 201);
  } catch (err) {
    console.error("Review POST error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = parseInt(searchParams.get("restaurantId") ?? "0");
    if (!restaurantId) return apiError("restaurantId required", 400);

    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.restaurantId, restaurantId), eq(reviews.isVisible, true)));

    return apiResponse(rows);
  } catch (err) {
    console.error("Reviews GET error:", err);
    return apiError("Internal server error", 500);
  }
}
