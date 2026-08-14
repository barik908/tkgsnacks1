import { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurants, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const rows = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        phone: restaurants.phone,
        address: restaurants.address,
        status: restaurants.status,
        isVisible: restaurants.isVisible,
        isOpen: restaurants.isOpen,
        isPartner: restaurants.isPartner,
        avgRating: restaurants.avgRating,
        totalReviews: restaurants.totalReviews,
        createdAt: restaurants.createdAt,
        ownerId: restaurants.ownerId,
        logoUrl: restaurants.logoUrl,
        cuisine: restaurants.cuisine,
        nidNumber: restaurants.nidNumber,
        tradeLicense: restaurants.tradeLicense,
        rejectionReason: restaurants.rejectionReason,
        adminNotes: restaurants.adminNotes,
      })
      .from(restaurants)
      .orderBy(desc(restaurants.createdAt));

    // Fetch owner info
    const withOwners = await Promise.all(
      rows.map(async (r) => {
        const [owner] = await db
          .select({ name: users.name, phone: users.phone, email: users.email })
          .from(users)
          .where(eq(users.id, r.ownerId))
          .limit(1);
        return { ...r, owner };
      })
    );

    return apiResponse(withOwners);
  } catch (err) {
    console.error("Admin restaurants GET error:", err);
    return apiError("Internal server error", 500);
  }
}
