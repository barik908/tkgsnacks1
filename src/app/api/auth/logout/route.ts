import { NextRequest } from "next/server";
import { db } from "@/db";
import { refreshTokens } from "@/db/schema";
import { hashToken, verifyRefreshToken } from "@/lib/auth";
import { apiResponse } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        const tokenHash = hashToken(refreshToken);
        await db
          .update(refreshTokens)
          .set({ isRevoked: true })
          .where(
            and(
              eq(refreshTokens.userId, payload.userId),
              eq(refreshTokens.tokenHash, tokenHash)
            )
          );
      } catch {
        // Token invalid, still clear cookies
      }
    }

    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");

    return apiResponse(null, "Logged out successfully");
  } catch (err) {
    console.error("Logout error:", err);
    return apiResponse(null, "Logged out");
  }
}
