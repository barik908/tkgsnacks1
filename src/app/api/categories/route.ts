import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories, restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  restaurantId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
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

    const [cat] = await db
      .insert(categories)
      .values({
        restaurantId: parsed.data.restaurantId,
        name: parsed.data.name,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();

    return apiResponse(cat, "Category created", 201);
  } catch (err) {
    console.error("Categories POST error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = parseInt(searchParams.get("restaurantId") ?? "0");
    if (!restaurantId) return apiError("restaurantId required", 400);

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.restaurantId, restaurantId));

    return apiResponse(cats);
  } catch (err) {
    console.error("Categories GET error:", err);
    return apiError("Internal server error", 500);
  }
}
