import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories, restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { id } = await params;
    const catId = parseInt(id);
    if (isNaN(catId)) return apiError("Invalid ID", 400);

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, catId))
      .limit(1);

    if (!cat) return apiError("Category not found", 404);

    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, cat.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, catId))
      .returning();

    return apiResponse(updated);
  } catch (err) {
    console.error("Category PATCH error:", err);
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

    const { id } = await params;
    const catId = parseInt(id);
    if (isNaN(catId)) return apiError("Invalid ID", 400);

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, catId))
      .limit(1);

    if (!cat) return apiError("Category not found", 404);

    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, cat.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    } else if (session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    await db.delete(categories).where(eq(categories.id, catId));
    return apiResponse(null, "Category deleted");
  } catch (err) {
    console.error("Category DELETE error:", err);
    return apiError("Internal server error", 500);
  }
}
