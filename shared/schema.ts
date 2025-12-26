import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (authentication for both admin and customers)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('customer'), // 'admin' | 'customer'
  createdAt: text("created_at"),
  // LGPD compliance fields
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: text("email_verified_at"),
  phone: text("phone"),
  consentMarketing: boolean("consent_marketing").default(false),
  consentTerms: boolean("consent_terms").default(false),
  consentPrivacy: boolean("consent_privacy").default(false),
  consentAt: text("consent_at"),
  lastLoginAt: text("last_login_at"),
  deletedAt: text("deleted_at"),
  anonymizedAt: text("anonymized_at"),
  retentionExpiresAt: text("retention_expires_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  emailVerifiedAt: true,
  consentAt: true,
  lastLoginAt: true,
  deletedAt: true,
  anonymizedAt: true,
  retentionExpiresAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Registration validation schema
export const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  consentTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms of Use" }) }),
  consentPrivacy: z.literal(true, { errorMap: () => ({ message: "You must accept the Privacy Policy" }) }),
  consentMarketing: z.boolean().optional().default(false),
});
export type RegisterUser = z.infer<typeof registerUserSchema>;

// Login validation schema
export const loginUserSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginUser = z.infer<typeof loginUserSchema>;

// Audit logs table for LGPD compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // 'login', 'logout', 'password_change', 'data_export', 'account_delete', 'consent_update'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string for additional info
  createdAt: text("created_at").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Data export requests table for LGPD compliance
export const dataExportRequests = pgTable("data_export_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  requestedAt: text("requested_at").notNull(),
  completedAt: text("completed_at"),
  downloadUrl: text("download_url"),
  expiresAt: text("expires_at"),
});

export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({ id: true });
export type InsertDataExportRequest = z.infer<typeof insertDataExportRequestSchema>;
export type DataExportRequest = typeof dataExportRequests.$inferSelect;

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Collections table
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image"), // Base64 or URL
});

export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true });
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // Base price (Diamante Natural)
  description: text("description").notNull(),
  image: text("image"), // Main image for store display (Base64 or URL)
  imageColor: text("image_color"), // Color image for hover (kept for backward compatibility)
  gallery: text("gallery").array(), // Additional images array (kept for backward compatibility)
  video: text("video"), // Product video 1 (base64 or URL)
  video2: text("video2"), // Product video 2 (base64 or URL)
  version1: text("version1"), // Version 1 image
  version2: text("version2"), // Version 2 image
  version3: text("version3"), // Version 3 image
  categoryId: integer("category_id").references(() => categories.id),
  collectionId: integer("collection_id").references(() => collections.id),
  specs: text("specs").array(), // Specifications array
  bestsellerOrder: integer("bestseller_order"), // Order in bestseller carousel (null = hidden)
  isNew: boolean("is_new").default(false),
  // Stone type variants (legacy fields kept for backward compatibility)
  priceDiamondSynthetic: integer("price_diamond_synthetic"),
  priceZirconia: integer("price_zirconia"),
  descriptionDiamondSynthetic: text("description_diamond_synthetic"),
  descriptionZirconia: text("description_zirconia"),
  specsDiamondSynthetic: text("specs_diamond_synthetic").array(),
  specsZirconia: text("specs_zirconia").array(),
  // Main stone name for the base price
  mainStoneName: text("main_stone_name"), // Name for the base price (e.g., "Diamante Natural")
  // Dynamic stone variations - JSON array of {name, price, description}
  stoneVariations: text("stone_variations"), // JSON string: [{name: "Diamante Natural", price: 10000, description: "..."}]
  // Zoom level for hover effect (100 = no zoom, 105 = 5% zoom, 110 = 10% zoom, etc)
  zoomLevel: integer("zoom_level").default(105),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Relations for products
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  collection: one(collections, {
    fields: [products.collectionId],
    references: [collections.id],
  }),
}));

// Journal posts table
export const journalPosts = pgTable("journal_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  image: text("image"), // Base64 or URL
});

export const insertJournalPostSchema = createInsertSchema(journalPosts).omit({ id: true });
export type InsertJournalPost = z.infer<typeof insertJournalPostSchema>;
export type JournalPost = typeof journalPosts.$inferSelect;

// Newsletter subscribers table
// type: 'newsletter' (site footer), 'lead' (registered but no purchase), 'customer' (made a purchase)
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(''),
  email: text("email").notNull().unique(),
  date: text("date").notNull(),
  status: text("status").notNull().default('active'), // 'active' | 'unsubscribed'
  type: text("type").notNull().default('newsletter'), // 'newsletter' | 'lead' | 'customer'
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true });
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull().unique(), // CUST-001 format
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  orders: integer("orders").default(0),
  totalSpent: integer("total_spent").default(0),
  lastOrder: text("last_order"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(), // ORD-001 format
  customerId: integer("customer_id").references(() => customers.id),
  customer: text("customer").notNull(), // Customer name for display
  date: text("date").notNull(),
  status: text("status").notNull(), // 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado'
  total: integer("total").notNull(),
  items: integer("items").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Relations for orders
export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

// Branding table (single row configuration)
export const branding = pgTable("branding", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  heroTitle: text("hero_title").notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  heroMediaType: text("hero_media_type").notNull(), // 'image' | 'video'
  heroMediaUrl: text("hero_media_url"),
  manifestoTitle: text("manifesto_title").notNull(),
  manifestoText: text("manifesto_text").notNull(),
  journalHeroImage: text("journal_hero_image"),
  journalHeroTitle: text("journal_hero_title").notNull(),
  journalHeroSubtitle: text("journal_hero_subtitle").notNull(),
  impactPhrase: text("impact_phrase").notNull(),
  // Lookbook page media
  lookbookMediaType: text("lookbook_media_type"), // 'image' | 'video'
  lookbookMediaUrl: text("lookbook_media_url"),
  // Noivas page media
  noivasMediaType: text("noivas_media_type"), // 'image' | 'video'
  noivasMediaUrl: text("noivas_media_url"),
  // Atelier page media
  atelierMediaType: text("atelier_media_type"), // 'image' | 'video'
  atelierMediaUrl: text("atelier_media_url"),
});

export const insertBrandingSchema = createInsertSchema(branding).omit({ id: true });
export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ id: true });
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  used: boolean("used").default(false),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
