import { db } from "@/db";
import {
  users,
  customers,
  restaurants,
  categories,
  menuItems,
  deliveryBoys,
  platformSettings,
} from "@/db/schema";
import { hashPassword, generateSlug } from "@/lib/auth";
import { apiResponse, apiError } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return apiError("Not allowed in production", 403);
  }

  try {
    // Platform settings
    const settingsData = [
      { key: "delivery_fee_partner", value: "50", description: "Delivery fee for partner restaurants (৳)" },
      { key: "delivery_fee_non_partner", value: "60", description: "Delivery fee for non-partner restaurants (৳)" },
      { key: "platform_name", value: "TKG Snacks", description: "Platform name" },
      { key: "platform_phone", value: "01700000000", description: "Platform contact number" },
      { key: "platform_address", value: "ঠাকুরগাঁও সদর, ঠাকুরগাঁও", description: "Platform address" },
    ];

    for (const s of settingsData) {
      const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, s.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(platformSettings).values(s);
      }
    }

    // Admin user
    let adminUser = await db.select().from(users).where(eq(users.phone, "01700000001")).limit(1);
    if (adminUser.length === 0) {
      const passwordHash = await hashPassword("admin123456");
      await db.insert(users).values({
        name: "TKG Admin",
        phone: "01700000001",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      });
      adminUser = await db.select().from(users).where(eq(users.phone, "01700000001")).limit(1);
    }

    // Restaurant owner
    let ownerUser = await db.select().from(users).where(eq(users.phone, "01700000002")).limit(1);
    if (ownerUser.length === 0) {
      const passwordHash = await hashPassword("owner123456");
      await db.insert(users).values({
        name: "ভাই ভাই রেস্টুরেন্ট",
        phone: "01700000002",
        passwordHash,
        role: "RESTAURANT_OWNER",
        isActive: true,
      });
      ownerUser = await db.select().from(users).where(eq(users.phone, "01700000002")).limit(1);
    }

    // Sample restaurant
    let rest = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerUser[0].id)).limit(1);
    if (rest.length === 0) {
      await db.insert(restaurants).values({
        ownerId: ownerUser[0].id,
        name: "ভাই ভাই রেস্টুরেন্ট",
        slug: "bhai-bhai-restaurant",
        description: "ঠাকুরগাঁওয়ের সেরা দেশীয় খাবারের রেস্টুরেন্ট। বিরিয়ানি, রোস্ট, কাবাব সহ আরও অনেক কিছু।",
        phone: "01700000002",
        address: "মুক্তিযোদ্ধা সড়ক, ঠাকুরগাঁও সদর",
        cuisine: "বাংলাদেশি",
        status: "APPROVED",
        isVisible: true,
        isOpen: true,
        isPartner: true,
        openingTime: "08:00",
        closingTime: "23:00",
      });
      rest = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerUser[0].id)).limit(1);
    }

    const restaurantId = rest[0].id;

    // Categories
    let cats = await db.select().from(categories).where(eq(categories.restaurantId, restaurantId));
    if (cats.length === 0) {
      await db.insert(categories).values([
        { restaurantId, name: "বিরিয়ানি", sortOrder: 1 },
        { restaurantId, name: "রোস্ট ও কাবাব", sortOrder: 2 },
        { restaurantId, name: "ভাত ও তরকারি", sortOrder: 3 },
        { restaurantId, name: "নাস্তা", sortOrder: 4 },
        { restaurantId, name: "পানীয়", sortOrder: 5 },
      ]);
      cats = await db.select().from(categories).where(eq(categories.restaurantId, restaurantId));
    }

    const [biriyaniCat, roastCat, riceCat, snackCat, drinkCat] = cats;

    // Menu items
    const existingItems = await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
    if (existingItems.length === 0) {
      await db.insert(menuItems).values([
        {
          restaurantId,
          categoryId: biriyaniCat?.id,
          name: "মুরগির বিরিয়ানি",
          description: "সুগন্ধি চালে রান্না মুরগির বিরিয়ানি",
          price: "120",
          isAvailable: true,
          preparationTime: 20,
        },
        {
          restaurantId,
          categoryId: biriyaniCat?.id,
          name: "গরুর বিরিয়ানি",
          description: "নরম গরুর মাংসের বিরিয়ানি",
          price: "150",
          isAvailable: true,
          preparationTime: 25,
        },
        {
          restaurantId,
          categoryId: roastCat?.id,
          name: "হাফ রোস্ট চিকেন",
          description: "মশলাদার হাফ রোস্ট চিকেন",
          price: "180",
          isAvailable: true,
          preparationTime: 30,
        },
        {
          restaurantId,
          categoryId: roastCat?.id,
          name: "চিকেন কাবাব (৬ পিস)",
          description: "গ্রিলড চিকেন কাবাব ৬ পিস",
          price: "130",
          isAvailable: true,
          preparationTime: 20,
        },
        {
          restaurantId,
          categoryId: riceCat?.id,
          name: "ভাত + ডাল + ভাজি",
          description: "সাদা ভাত, ডাল এবং মৌসুমী ভাজি",
          price: "80",
          isAvailable: true,
          isVeg: true,
          preparationTime: 15,
        },
        {
          restaurantId,
          categoryId: riceCat?.id,
          name: "ভাত + মাছের তরকারি",
          description: "সাদা ভাত এবং তাজা মাছের তরকারি",
          price: "100",
          isAvailable: true,
          preparationTime: 15,
        },
        {
          restaurantId,
          categoryId: snackCat?.id,
          name: "সিঙ্গারা (৪ পিস)",
          description: "খাস্তা সিঙ্গারা ৪ পিস",
          price: "40",
          isAvailable: true,
          isVeg: true,
          preparationTime: 10,
        },
        {
          restaurantId,
          categoryId: snackCat?.id,
          name: "পরোটা + ডিম ভাজা",
          description: "গরম পরোটা এবং ডিম ভাজা",
          price: "60",
          isAvailable: true,
          preparationTime: 15,
        },
        {
          restaurantId,
          categoryId: drinkCat?.id,
          name: "কোকা-কোলা",
          description: "ঠান্ডা কোকা-কোলা ৩৩০ml",
          price: "40",
          isAvailable: true,
          preparationTime: 2,
        },
        {
          restaurantId,
          categoryId: drinkCat?.id,
          name: "লেবুর শরবত",
          description: "তাজা লেবুর শরবত",
          price: "30",
          isAvailable: true,
          isVeg: true,
          preparationTime: 5,
        },
      ]);
    }

    // Customer user
    let custUser = await db.select().from(users).where(eq(users.phone, "01700000003")).limit(1);
    if (custUser.length === 0) {
      const passwordHash = await hashPassword("customer123");
      await db.insert(users).values({
        name: "সাধারণ কাস্টমার",
        phone: "01700000003",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      });
      custUser = await db.select().from(users).where(eq(users.phone, "01700000003")).limit(1);
      await db.insert(customers).values({ userId: custUser[0].id });
    }

    // Delivery boy
    let dbUser = await db.select().from(users).where(eq(users.phone, "01700000004")).limit(1);
    if (dbUser.length === 0) {
      const passwordHash = await hashPassword("delivery123");
      await db.insert(users).values({
        name: "রহিম ডেলিভারি",
        phone: "01700000004",
        passwordHash,
        role: "DELIVERY_BOY",
        isActive: true,
      });
      dbUser = await db.select().from(users).where(eq(users.phone, "01700000004")).limit(1);
      await db.insert(deliveryBoys).values({
        userId: dbUser[0].id,
        vehicleType: "মোটরসাইকেল",
        vehicleNumber: "ঠাকুরগাঁও-মেট্রো-০০১",
        status: "APPROVED",
      });
    }

    return apiResponse({
      admin: { phone: "01700000001", password: "admin123456" },
      restaurantOwner: { phone: "01700000002", password: "owner123456" },
      customer: { phone: "01700000003", password: "customer123" },
      deliveryBoy: { phone: "01700000004", password: "delivery123" },
    }, "Database seeded successfully");
  } catch (err) {
    console.error("Seed error:", err);
    return apiError(`Seed failed: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
}
