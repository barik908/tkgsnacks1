import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    if (session.role !== "RESTAURANT_OWNER" && session.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const [rest] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerId, session.userId))
      .limit(1);

    if (!rest) return apiError("No restaurant found", 404);

    return apiResponse(rest);
  } catch (err) {
    console.error("My restaurant error:", err);
    return apiError("Internal server error", 500);
  }
}
