import { NextRequest } from "next/server";
import { db } from "@/db";
import { deliveryBoys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  isOnline: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "DELIVERY_BOY") return apiError("Forbidden", 403);

    const [dboy] = await db
      .select()
      .from(deliveryBoys)
      .where(eq(deliveryBoys.userId, session.userId))
      .limit(1);

    if (!dboy) return apiError("Delivery boy not found", 404);
    if (dboy.status !== "APPROVED") return apiError("Account not approved", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400);

    const [updated] = await db
      .update(deliveryBoys)
      .set({ isOnline: parsed.data.isOnline, updatedAt: new Date() })
      .where(eq(deliveryBoys.id, dboy.id))
      .returning({ isOnline: deliveryBoys.isOnline });

    return apiResponse(updated, `You are now ${parsed.data.isOnline ? "online" : "offline"}`);
  } catch (err) {
    console.error("Delivery status error:", err);
    return apiError("Internal server error", 500);
  }
}
