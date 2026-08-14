import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, customers, deliveryBoys } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const filtered = role ? rows.filter((u) => u.role === role) : rows;

    return apiResponse(filtered);
  } catch (err) {
    console.error("Admin users GET error:", err);
    return apiError("Internal server error", 500);
  }
}
