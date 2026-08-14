import { db } from "@/db";
import { users, customers, restaurants, deliveryBoys } from "@/db/schema";
import { getSession } from "@/lib/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return apiError("User not found", 404);
    }

    let profileData: Record<string, unknown> = {};

    if (user.role === "CUSTOMER") {
      const [cust] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, user.id))
        .limit(1);
      if (cust) profileData = { customerId: cust.id };
    } else if (user.role === "RESTAURANT_OWNER") {
      const [rest] = await db
        .select({ id: restaurants.id, name: restaurants.name, status: restaurants.status })
        .from(restaurants)
        .where(eq(restaurants.ownerId, user.id))
        .limit(1);
      if (rest) profileData = { restaurant: rest };
    } else if (user.role === "DELIVERY_BOY") {
      const [db2] = await db
        .select({ id: deliveryBoys.id, status: deliveryBoys.status, isOnline: deliveryBoys.isOnline })
        .from(deliveryBoys)
        .where(eq(deliveryBoys.userId, user.id))
        .limit(1);
      if (db2) profileData = { deliveryBoy: db2 };
    }

    return apiResponse({ ...user, ...profileData });
  } catch (err) {
    console.error("Me error:", err);
    return apiError("Internal server error", 500);
  }
}
