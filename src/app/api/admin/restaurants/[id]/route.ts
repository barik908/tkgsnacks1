import { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  isVisible: z.boolean().optional(),
  isPartner: z.boolean().optional(),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
  deliveryFeeOverride: z.number().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const { id } = await params;
    const restaurantId = parseInt(id);
    if (isNaN(restaurantId)) return apiError("Invalid ID", 400);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.deliveryFeeOverride !== undefined) {
      updateData.deliveryFeeOverride = parsed.data.deliveryFeeOverride.toString();
    }

    const [updated] = await db
      .update(restaurants)
      .set(updateData)
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (!updated) return apiError("Restaurant not found", 404);

    return apiResponse(updated, "Restaurant updated");
  } catch (err) {
    console.error("Admin restaurant PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}
