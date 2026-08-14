import { NextRequest } from "next/server";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiResponse, apiError } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const settings = await db.select().from(platformSettings);
    return apiResponse(settings);
  } catch (err) {
    console.error("Settings GET error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    // Upsert
    const existing = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, parsed.data.key))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(platformSettings)
        .set({ value: parsed.data.value, description: parsed.data.description, updatedAt: new Date() })
        .where(eq(platformSettings.key, parsed.data.key))
        .returning();
      return apiResponse(updated, "Setting updated");
    } else {
      const [created] = await db
        .insert(platformSettings)
        .values(parsed.data)
        .returning();
      return apiResponse(created, "Setting created", 201);
    }
  } catch (err) {
    console.error("Settings POST error:", err);
    return apiError("Internal server error", 500);
  }
}
