import {
  pgTable,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  serial,
  varchar,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "CUSTOMER",
  "RESTAURANT_OWNER",
  "DELIVERY_BOY",
  "ADMIN",
]);

export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH_ON_DELIVERY",
  "ONLINE",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const deliveryBoyStatusEnum = pgEnum("delivery_boy_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 150 }),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    isActive: boolean("is_active").notNull().default(true),
    isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_phone_unique").on(t.phone)]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
  restaurantOwner: one(restaurants, { fields: [users.id], references: [restaurants.ownerId] }),
  deliveryBoy: one(deliveryBoys, { fields: [users.id], references: [deliveryBoys.userId] }),
  refreshTokens: many(refreshTokens),
}));

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("refresh_tokens_user_idx").on(t.userId)]
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  defaultAddress: text("default_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  cart: one(cart, { fields: [customers.id], references: [cart.customerId] }),
}));

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 50 }).default("Home"),
    fullAddress: text("full_address").notNull(),
    landmark: text("landmark"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("addresses_customer_idx").on(t.customerId)]
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));

// ─── Restaurants ──────────────────────────────────────────────────────────────

export const restaurants = pgTable(
  "restaurants",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    description: text("description"),
    phone: varchar("phone", { length: 20 }).notNull(),
    address: text("address").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    cuisine: varchar("cuisine", { length: 100 }),
    openingTime: varchar("opening_time", { length: 10 }).default("09:00"),
    closingTime: varchar("closing_time", { length: 10 }).default("22:00"),
    isOpen: boolean("is_open").notNull().default(false),
    isVisible: boolean("is_visible").notNull().default(true),
    status: restaurantStatusEnum("status").notNull().default("PENDING"),
    isPartner: boolean("is_partner").notNull().default(true),
    deliveryFeeOverride: decimal("delivery_fee_override", { precision: 8, scale: 2 }),
    minOrderAmount: decimal("min_order_amount", { precision: 8, scale: 2 }).default("0"),
    avgRating: decimal("avg_rating", { precision: 3, scale: 2 }).default("0"),
    totalReviews: integer("total_reviews").notNull().default(0),
    nidNumber: varchar("nid_number", { length: 30 }),
    tradeLicense: varchar("trade_license", { length: 50 }),
    businessDocs: jsonb("business_docs"),
    rejectionReason: text("rejection_reason"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("restaurants_slug_unique").on(t.slug),
    index("restaurants_status_idx").on(t.status),
    index("restaurants_visible_idx").on(t.isVisible),
  ]
);

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerId], references: [users.id] }),
  categories: many(categories),
  menuItems: many(menuItems),
  orders: many(orders),
  reviews: many(reviews),
}));

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("categories_restaurant_idx").on(t.restaurantId)]
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [categories.restaurantId], references: [restaurants.id] }),
  menuItems: many(menuItems),
}));

// ─── Menu Items ───────────────────────────────────────────────────────────────

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    images: jsonb("images").$type<string[]>().default([]),
    isAvailable: boolean("is_available").notNull().default(true),
    isVeg: boolean("is_veg").notNull().default(false),
    preparationTime: integer("preparation_time").default(20),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("menu_items_restaurant_idx").on(t.restaurantId),
    index("menu_items_category_idx").on(t.categoryId),
  ]
);

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cart = pgTable("cart", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().unique().references(() => customers.id, { onDelete: "cascade" }),
  restaurantId: integer("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartRelations = relations(cart, ({ one, many }) => ({
  customer: one(customers, { fields: [cart.customerId], references: [customers.id] }),
  restaurant: one(restaurants, { fields: [cart.restaurantId], references: [restaurants.id] }),
  items: many(cartItems),
}));

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id").notNull().references(() => cart.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    specialInstructions: text("special_instructions"),
  },
  (t) => [
    index("cart_items_cart_idx").on(t.cartId),
    uniqueIndex("cart_items_unique").on(t.cartId, t.menuItemId),
  ]
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, { fields: [cartItems.cartId], references: [cart.id] }),
  menuItem: one(menuItems, { fields: [cartItems.menuItemId], references: [menuItems.id] }),
}));

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 20 }).notNull(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
    deliveryBoyId: integer("delivery_boy_id").references(() => deliveryBoys.id),
    status: orderStatusEnum("status").notNull().default("PLACED"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH_ON_DELIVERY"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: decimal("delivery_fee", { precision: 8, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    customerName: varchar("customer_name", { length: 100 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryLandmark: text("delivery_landmark"),
    deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 7 }),
    deliveryLongitude: decimal("delivery_longitude", { precision: 10, scale: 7 }),
    deliveryInstructions: text("delivery_instructions"),
    verificationCode: varchar("verification_code", { length: 6 }),
    estimatedDeliveryTime: integer("estimated_delivery_time"),
    actualDeliveryTime: timestamp("actual_delivery_time"),
    rejectionReason: text("rejection_reason"),
    cancelReason: text("cancel_reason"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_order_number_unique").on(t.orderNumber),
    index("orders_customer_idx").on(t.customerId),
    index("orders_restaurant_idx").on(t.restaurantId),
    index("orders_delivery_boy_idx").on(t.deliveryBoyId),
    index("orders_status_idx").on(t.status),
  ]
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  deliveryBoy: one(deliveryBoys, { fields: [orders.deliveryBoyId], references: [deliveryBoys.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  review: one(reviews, { fields: [orders.id], references: [reviews.orderId] }),
}));

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
    name: varchar("name", { length: 150 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    specialInstructions: text("special_instructions"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

// ─── Order Status History ─────────────────────────────────────────────────────

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    changedById: integer("changed_by_id").references(() => users.id),
    changedByRole: userRoleEnum("changed_by_role"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)]
);

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  changedBy: one(users, { fields: [orderStatusHistory.changedById], references: [users.id] }),
}));

// ─── Delivery Boys ────────────────────────────────────────────────────────────

export const deliveryBoys = pgTable(
  "delivery_boys",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    status: deliveryBoyStatusEnum("status").notNull().default("PENDING"),
    isOnline: boolean("is_online").notNull().default(false),
    vehicleType: varchar("vehicle_type", { length: 50 }),
    vehicleNumber: varchar("vehicle_number", { length: 20 }),
    nidNumber: varchar("nid_number", { length: 30 }),
    currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }),
    currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }),
    totalDeliveries: integer("total_deliveries").notNull().default(0),
    totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
    cashInHand: decimal("cash_in_hand", { precision: 12, scale: 2 }).notNull().default("0"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("delivery_boys_status_idx").on(t.status)]
);

export const deliveryBoysRelations = relations(deliveryBoys, ({ one, many }) => ({
  user: one(users, { fields: [deliveryBoys.userId], references: [users.id] }),
  orders: many(orders),
  cashLedger: many(cashLedger),
}));

// ─── Platform Settings ────────────────────────────────────────────────────────

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().unique().references(() => orders.id),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
    foodRating: integer("food_rating").notNull(),
    deliveryRating: integer("delivery_rating"),
    comment: text("comment"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("reviews_restaurant_idx").on(t.restaurantId),
    index("reviews_customer_idx").on(t.customerId),
  ]
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [reviews.customerId], references: [customers.id] }),
  restaurant: one(restaurants, { fields: [reviews.restaurantId], references: [restaurants.id] }),
}));

// ─── Cash Ledger ──────────────────────────────────────────────────────────────

export const cashLedger = pgTable(
  "cash_ledger",
  {
    id: serial("id").primaryKey(),
    deliveryBoyId: integer("delivery_boy_id").notNull().references(() => deliveryBoys.id),
    orderId: integer("order_id").references(() => orders.id),
    type: varchar("type", { length: 20 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    note: text("note"),
    recordedById: integer("recorded_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("cash_ledger_delivery_boy_idx").on(t.deliveryBoyId)]
);

export const cashLedgerRelations = relations(cashLedger, ({ one }) => ({
  deliveryBoy: one(deliveryBoys, { fields: [cashLedger.deliveryBoyId], references: [deliveryBoys.id] }),
  order: one(orders, { fields: [cashLedger.orderId], references: [orders.id] }),
  recordedBy: one(users, { fields: [cashLedger.recordedById], references: [users.id] }),
}));

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    data: jsonb("data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
