import {
  users, categories, collections, products, journalPosts, subscribers,
  customers, orders, branding, emailVerificationTokens, passwordResetTokens,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Collection, type InsertCollection,
  type Product, type InsertProduct,
  type JournalPost, type InsertJournalPost,
  type Subscriber, type InsertSubscriber,
  type Customer, type InsertCustomer,
  type Order, type InsertOrder,
  type Branding, type InsertBranding,
  type EmailVerificationToken, type InsertEmailVerificationToken,
  type PasswordResetToken, type InsertPasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNotNull, asc, and, gt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAdminUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  // Collections
  getCollections(): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductsByCollection(collectionId: number): Promise<Product[]>;
  getBestsellers(): Promise<Product[]>;
  getNewProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Journal Posts
  getJournalPosts(): Promise<JournalPost[]>;
  getJournalPostById(id: number): Promise<JournalPost | undefined>;
  createJournalPost(post: InsertJournalPost): Promise<JournalPost>;
  updateJournalPost(id: number, post: Partial<InsertJournalPost>): Promise<JournalPost | undefined>;
  deleteJournalPost(id: number): Promise<void>;

  // Subscribers
  getSubscribers(): Promise<Subscriber[]>;
  getSubscribersByType(type: string): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  createOrUpdateSubscriber(email: string, name: string, type: string): Promise<Subscriber>;
  createSubscribersBulk(subscribers: InsertSubscriber[]): Promise<{ inserted: number; skipped: number }>;
  updateSubscriber(id: number, subscriber: Partial<InsertSubscriber>): Promise<Subscriber | undefined>;
  upgradeSubscriberToCustomer(email: string): Promise<Subscriber | undefined>;
  deleteSubscriber(id: number): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<void>;

  // Branding
  getBranding(): Promise<Branding | undefined>;
  createOrUpdateBranding(branding: InsertBranding): Promise<Branding>;

  // Email Verification Tokens (kept for backward compatibility, but no longer used)
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationTokensByUserId(userId: number): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  deletePasswordResetTokensByUserId(userId: number): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date().toISOString(),
    }).returning();
    return user;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'admin'));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    return await db.select().from(collections);
  }

  async getCollectionBySlug(slug: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.slug, slug));
    return collection || undefined;
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db.insert(collections).values(collection).returning();
    return newCollection;
  }

  async updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db.update(collections).set(collection).where(eq(collections.id, id)).returning();
    return updated || undefined;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collections).where(eq(collections.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async getProductsByCollection(collectionId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.collectionId, collectionId));
  }

  async getBestsellers(): Promise<Product[]> {
    return await db.select().from(products)
      .where(isNotNull(products.bestsellerOrder))
      .orderBy(asc(products.bestsellerOrder));
  }

  async getNewProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isNew, true));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Journal Posts
  async getJournalPosts(): Promise<JournalPost[]> {
    return await db.select().from(journalPosts).orderBy(desc(journalPosts.id));
  }

  async getJournalPostById(id: number): Promise<JournalPost | undefined> {
    const [post] = await db.select().from(journalPosts).where(eq(journalPosts.id, id));
    return post || undefined;
  }

  async createJournalPost(post: InsertJournalPost): Promise<JournalPost> {
    const [newPost] = await db.insert(journalPosts).values(post).returning();
    return newPost;
  }

  async updateJournalPost(id: number, post: Partial<InsertJournalPost>): Promise<JournalPost | undefined> {
    const [updated] = await db.update(journalPosts).set(post).where(eq(journalPosts.id, id)).returning();
    return updated || undefined;
  }

  async deleteJournalPost(id: number): Promise<void> {
    await db.delete(journalPosts).where(eq(journalPosts.id, id));
  }

  // Subscribers
  async getSubscribers(): Promise<Subscriber[]> {
    return await db.select().from(subscribers).orderBy(desc(subscribers.id));
  }

  async getSubscribersByType(type: string): Promise<Subscriber[]> {
    return await db.select().from(subscribers).where(eq(subscribers.type, type)).orderBy(desc(subscribers.id));
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return subscriber || undefined;
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    const [newSubscriber] = await db.insert(subscribers).values(subscriber).returning();
    return newSubscriber;
  }

  async createOrUpdateSubscriber(email: string, name: string, type: string): Promise<Subscriber> {
    const existing = await this.getSubscriberByEmail(email.toLowerCase());
    if (existing) {
      const typeOrder = { newsletter: 1, lead: 2, customer: 3 };
      const existingOrder = typeOrder[existing.type as keyof typeof typeOrder] || 0;
      const newOrder = typeOrder[type as keyof typeof typeOrder] || 0;
      if (newOrder > existingOrder) {
        const [updated] = await db.update(subscribers)
          .set({ type, name: name || existing.name })
          .where(eq(subscribers.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }
    const [newSubscriber] = await db.insert(subscribers).values({
      email: email.toLowerCase(),
      name,
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      type,
    }).returning();
    return newSubscriber;
  }

  async createSubscribersBulk(subscribersList: InsertSubscriber[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;
    
    for (const sub of subscribersList) {
      try {
        const existing = await this.getSubscriberByEmail(sub.email.toLowerCase());
        if (existing) {
          skipped++;
        } else {
          await db.insert(subscribers).values({
            ...sub,
            email: sub.email.toLowerCase(),
            type: sub.type || 'newsletter',
          });
          inserted++;
        }
      } catch (err) {
        skipped++;
      }
    }
    
    return { inserted, skipped };
  }

  async updateSubscriber(id: number, subscriber: Partial<InsertSubscriber>): Promise<Subscriber | undefined> {
    const [updated] = await db.update(subscribers).set(subscriber).where(eq(subscribers.id, id)).returning();
    return updated || undefined;
  }

  async upgradeSubscriberToCustomer(email: string): Promise<Subscriber | undefined> {
    const existing = await this.getSubscriberByEmail(email.toLowerCase());
    if (existing) {
      const [updated] = await db.update(subscribers)
        .set({ type: 'customer' })
        .where(eq(subscribers.id, existing.id))
        .returning();
      return updated;
    }
    return undefined;
  }

  async deleteSubscriber(id: number): Promise<void> {
    await db.delete(subscribers).where(eq(subscribers.id, id));
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.totalSpent));
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.id));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(order).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // Branding
  async getBranding(): Promise<Branding | undefined> {
    const [brandingData] = await db.select().from(branding).limit(1);
    return brandingData || undefined;
  }

  async createOrUpdateBranding(brandingData: InsertBranding): Promise<Branding> {
    const existing = await this.getBranding();
    if (existing) {
      const [updated] = await db.update(branding).set(brandingData).where(eq(branding.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(branding).values(brandingData).returning();
      return created;
    }
  }

  // Email Verification Tokens
  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [created] = await db.insert(emailVerificationTokens).values(token).returning();
    return created;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [tokenData] = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return tokenData || undefined;
  }

  async deleteEmailVerificationTokensByUserId(userId: number): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  }


  // Password Reset Tokens
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [created] = await db.insert(passwordResetTokens).values(token).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [tokenData] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false)
      ));
    return tokenData || undefined;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
  }

  async deletePasswordResetTokensByUserId(userId: number): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
