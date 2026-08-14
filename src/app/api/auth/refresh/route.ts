import { db } from "@/db";
import { refreshTokens } from "@/db/schema";
import { verifyRefreshToken, signAccessToken, hashToken } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return apiError("No refresh token", 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return apiError("Invalid refresh token", 401);
    }

    const tokenHash = hashToken(refreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, payload.userId),
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      return apiError("Refresh token expired or revoked", 401);
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      role: payload.role,
      phone: payload.phone,
    });

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    return apiResponse({ accessToken }, "Token refreshed");
  } catch (err) {
    console.error("Refresh error:", err);
    return apiError("Internal server error", 500);
  }
}
