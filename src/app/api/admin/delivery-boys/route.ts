import { NextRequest } from "next/server";
import { db } from "@/db";
import { deliveryBoys, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const rows = await db
      .select({
        id: deliveryBoys.id,
        userId: deliveryBoys.userId,
        status: deliveryBoys.status,
        isOnline: deliveryBoys.isOnline,
        vehicleType: deliveryBoys.vehicleType,
        vehicleNumber: deliveryBoys.vehicleNumber,
        totalDeliveries: deliveryBoys.totalDeliveries,
        totalEarnings: deliveryBoys.totalEarnings,
        cashInHand: deliveryBoys.cashInHand,
        rejectionReason: deliveryBoys.rejectionReason,
        createdAt: deliveryBoys.createdAt,
      })
      .from(deliveryBoys)
      .orderBy(desc(deliveryBoys.createdAt));

    const withUsers = await Promise.all(
      rows.map(async (db2) => {
        const [u] = await db
          .select({ name: users.name, phone: users.phone })
          .from(users)
          .where(eq(users.id, db2.userId))
          .limit(1);
        return { ...db2, user: u };
      })
    );

    return apiResponse(withUsers);
  } catch (err) {
    console.error("Admin delivery boys GET error:", err);
    return apiError("Internal server error", 500);
  }
}
