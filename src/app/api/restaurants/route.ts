import { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurants, users } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { generateSlug } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  phone: z.string().min(10),
  address: z.string().min(5),
  cuisine: z.string().optional(),
  nidNumber: z.string().optional(),
  tradeLicense: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const cuisine = searchParams.get("cuisine") ?? "";

    // Only show APPROVED + visible restaurants to public
    const conditions = [
      eq(restaurants.status, "APPROVED"),
      eq(restaurants.isVisible, true),
    ];

    const rows = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        description: restaurants.description,
        logoUrl: restaurants.logoUrl,
        coverUrl: restaurants.coverUrl,
        cuisine: restaurants.cuisine,
        address: restaurants.address,
        isOpen: restaurants.isOpen,
        avgRating: restaurants.avgRating,
        totalReviews: restaurants.totalReviews,
        minOrderAmount: restaurants.minOrderAmount,
        openingTime: restaurants.openingTime,
        closingTime: restaurants.closingTime,
        isPartner: restaurants.isPartner,
      })
      .from(restaurants)
      .where(and(...conditions));

    // Filter by search
    let filtered = rows;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.cuisine ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      );
    }
    if (cuisine) {
      const q = cuisine.toLowerCase();
      filtered = filtered.filter((r) =>
        (r.cuisine ?? "").toLowerCase().includes(q)
      );
    }

    return apiResponse(filtered);
  } catch (err) {
    console.error("Restaurants GET error:", err);
    return apiError("Internal server error", 500);
  }
}

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

    // Check if owner already has a restaurant
    if (session.role === "RESTAURANT_OWNER") {
      const existing = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.ownerId, session.userId))
        .limit(1);
      if (existing.length > 0) {
        return apiError("You already have a registered restaurant", 409);
      }
    }

    const { name, description, phone, address, cuisine, nidNumber, tradeLicense, openingTime, closingTime } = parsed.data;

    let slug = generateSlug(name);
    // Ensure unique slug
    const slugExists = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, slug))
      .limit(1);
    if (slugExists.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const ownerId = session.userId;

    // Update user role if needed
    await db
      .update(users)
      .set({ role: "RESTAURANT_OWNER" })
      .where(eq(users.id, ownerId));

    const [rest] = await db
      .insert(restaurants)
      .values({
        ownerId,
        name,
        slug,
        description,
        phone,
        address,
        cuisine,
        nidNumber,
        tradeLicense,
        openingTime: openingTime ?? "09:00",
        closingTime: closingTime ?? "22:00",
        status: "PENDING",
      })
      .returning();

    return apiResponse(rest, "Restaurant registered successfully", 201);
  } catch (err) {
    console.error("Restaurant POST error:", err);
    return apiError("Internal server error", 500);
  }
}
