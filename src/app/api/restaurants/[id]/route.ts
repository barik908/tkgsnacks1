import { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurants, menuItems, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  cuisine: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  isOpen: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) return apiError("Invalid restaurant ID", 400);

    const session = await getSession();
    const isAdminOrOwner =
      session &&
      (session.role === "ADMIN" ||
        (session.role === "RESTAURANT_OWNER" && session.userId !== undefined));

    const [rest] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!rest) return apiError("Restaurant not found", 404);

    // Public access: only APPROVED + visible
    if (!isAdminOrOwner) {
      if (rest.status !== "APPROVED" || !rest.isVisible) {
        return apiError("Restaurant not found", 404);
      }
    } else if (session?.role === "RESTAURANT_OWNER") {
      if (rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    }

    // Fetch categories and menu items
    const cats = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, restaurantId), eq(categories.isActive, true)));

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    return apiResponse({ ...rest, categories: cats, menuItems: items });
  } catch (err) {
    console.error("Restaurant GET error:", err);
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
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) return apiError("Invalid restaurant ID", 400);

    const [rest] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!rest) return apiError("Restaurant not found", 404);

    // Only owner or admin can update
    if (session.role === "RESTAURANT_OWNER" && rest.ownerId !== session.userId) {
      return apiError("Forbidden", 403);
    }
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const [updated] = await db
      .update(restaurants)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    return apiResponse(updated, "Restaurant updated");
  } catch (err) {
    console.error("Restaurant PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}
