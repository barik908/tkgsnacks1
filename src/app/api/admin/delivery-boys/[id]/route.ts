import { NextRequest } from "next/server";
import { db } from "@/db";
import { deliveryBoys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const { id } = await params;
    const dbId = parseInt(id);
    if (isNaN(dbId)) return apiError("Invalid ID", 400);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const [updated] = await db
      .update(deliveryBoys)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(deliveryBoys.id, dbId))
      .returning();

    if (!updated) return apiError("Delivery boy not found", 404);

    return apiResponse(updated, "Delivery boy updated");
  } catch (err) {
    console.error("Admin delivery boy PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}
