import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      status: "ok",
      app: "TKG Snacks",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { status: "error", database: "disconnected", error: String(err) },
      { status: 503 }
    );
  }
}
