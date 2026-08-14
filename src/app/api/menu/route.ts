import { NextRequest } from "next/server";
import { db } from "@/db";
import { menuItems, restaurants, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  restaurantId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  price: z.number().positive(),
  images: z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
  isVeg: z.boolean().optional(),
  preparationTime: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    // Verify ownership
    if (session.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ ownerId: restaurants.ownerId })
        .from(restaurants)
        .where(eq(restaurants.id, parsed.data.restaurantId))
        .limit(1);
      if (!rest || rest.ownerId !== session.userId) {
        return apiError("Forbidden", 403);
      }
    }

    const [item] = await db
      .insert(menuItems)
      .values({
        restaurantId: parsed.data.restaurantId,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price.toString(),
        images: parsed.data.images ?? [],
        isAvailable: parsed.data.isAvailable ?? true,
        isVeg: parsed.data.isVeg ?? false,
        preparationTime: parsed.data.preparationTime ?? 20,
      })
      .returning();

    return apiResponse(item, "Menu item created", 201);
  } catch (err) {
    console.error("Menu POST error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = parseInt(searchParams.get("restaurantId") ?? "0");
    if (!restaurantId) return apiError("restaurantId required", 400);

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    return apiResponse(items);
  } catch (err) {
    console.error("Menu GET error:", err);
    return apiError("Internal server error", 500);
  }
}
