import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return apiError("Invalid ID", 400);

    // Prevent disabling self
    if (userId === session.userId) {
      return apiError("Cannot modify your own account", 400);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) return apiError("User not found", 404);

    return apiResponse(updated, "User updated");
  } catch (err) {
    console.error("Admin user PATCH error:", err);
    return apiError("Internal server error", 500);
  }
}
