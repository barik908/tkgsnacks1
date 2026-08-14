import { NextRequest } from "next/server";
import { db } from "@/db";
import { menuItems, restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
  isVeg: z.boolean().optional(),
  preparationTime: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) return apiError("Invalid ID", 400);

    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, itemId))
      .limit(1);

    if (!item) return apiError("Menu item not found", 404);

    // Verify ownership
    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, item.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.price !== undefined) {
      updateData.price = parsed.data.price.toString();
    }

    const [updated] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, itemId))
      .returning();

    return apiResponse(updated, "Menu item updated");
  } catch (err) {
    console.error("Menu PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) return apiError("Invalid ID", 400);

    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, itemId))
      .limit(1);

    if (!item) return apiError("Menu item not found", 404);

    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, item.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    }

    await db.delete(menuItems).where(eq(menuItems.id, itemId));

    return apiResponse(null, "Menu item deleted");
  } catch (err) {
    console.error("Menu DELETE error:", err);
    return apiError("Internal server error", 500);
  }
}
