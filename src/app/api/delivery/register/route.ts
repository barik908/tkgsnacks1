import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, deliveryBoys, refreshTokens } from "@/db/schema";
import { hashPassword, signAccessToken, signRefreshToken, hashToken } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^01[3-9]\d{8}$/, "Valid Bangladeshi phone required"),
  password: z.string().min(6),
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  nidNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const { name, phone, password, vehicleType, vehicleNumber, nidNumber } = parsed.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existing.length > 0) return apiError("Phone number already registered", 409);

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({ name, phone, passwordHash, role: "DELIVERY_BOY" })
      .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role });

    await db.insert(deliveryBoys).values({
      userId: user.id,
      vehicleType,
      vehicleNumber,
      nidNumber,
      status: "PENDING",
    });

    const payload = { userId: user.id, role: user.role, phone: user.phone };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60, path: "/" });
    cookieStore.set("refresh_token", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });

    return apiResponse({ user }, "Registration submitted. Awaiting admin approval.", 201);
  } catch (err) {
    console.error("Delivery register error:", err);
    return apiError("Internal server error", 500);
  }
}
