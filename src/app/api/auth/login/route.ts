import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, refreshTokens } from "@/db/schema";
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
  hashToken,
} from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const { phone, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      return apiError("Invalid phone or password", 401);
    }

    if (!user.isActive) {
      return apiError("Your account has been suspended", 403);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid phone or password", 401);
    }

    const payload = { userId: user.id, role: user.role, phone: user.phone };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return apiResponse({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    }, "Login successful");
  } catch (err) {
    console.error("Login error:", err);
    return apiError("Internal server error", 500);
  }
}
