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
  emailVerified: boolean("email_verified").default(false),
  createdAt: text("created_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, emailVerified: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  price: integer("price").notNull(),
  description: text("description").notNull(),
  image: text("image"), // P&B image (Base64 or URL)
  imageColor: text("image_color"), // Color image for hover
  gallery: text("gallery").array(), // Additional images array
  categoryId: integer("category_id").references(() => categories.id),
  collectionId: integer("collection_id").references(() => collections.id),
  specs: text("specs").array(), // Specifications array
  bestsellerOrder: integer("bestseller_order"), // Order in bestseller carousel (null = hidden)
  isNew: boolean("is_new").default(false),
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
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  date: text("date").notNull(),
  status: text("status").notNull().default('active'), // 'active' | 'unsubscribed'
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
});

export const insertBrandingSchema = createInsertSchema(branding).omit({ id: true });
export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;
