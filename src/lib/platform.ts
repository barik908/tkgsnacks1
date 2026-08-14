import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const PLATFORM_KEYS = {
  DELIVERY_FEE_PARTNER: "delivery_fee_partner",
  DELIVERY_FEE_NON_PARTNER: "delivery_fee_non_partner",
  PLATFORM_NAME: "platform_name",
  PLATFORM_PHONE: "platform_phone",
  PLATFORM_ADDRESS: "platform_address",
  MIN_ORDER_AMOUNT: "min_order_amount",
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function getDeliveryFee(isPartner: boolean): Promise<number> {
  const key = isPartner
    ? PLATFORM_KEYS.DELIVERY_FEE_PARTNER
    : PLATFORM_KEYS.DELIVERY_FEE_NON_PARTNER;
  const val = await getSetting(key);
  if (isPartner) return val ? parseFloat(val) : 50;
  return val ? parseFloat(val) : 60;
}
