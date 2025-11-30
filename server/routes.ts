import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import {
  insertUserSchema, insertCategorySchema, insertCollectionSchema,
  insertProductSchema, insertJournalPostSchema, insertSubscriberSchema,
  insertCustomerSchema, insertOrderSchema, insertBrandingSchema,
  type User,
} from "@shared/schema";
import { sendPasswordResetEmail } from "./email";
import { validatePassword, isPasswordValid } from "../shared/passwordStrength";

// Extend Express User type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: string;
    }
  }
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autenticado" });
}

// Admin-only middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Acesso negado. Apenas administradores." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "zk-rezk-luxury-jewelry-secret-2026",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Usuário não encontrado" });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Senha incorreta" });
        }
        
        return done(null, { id: user.id, username: user.username, role: user.role });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, { id: user.id, username: user.username, role: user.role });
    } catch (err) {
      done(err);
    }
  });

  // ============ AUTH ROUTES ============
  
  // Customer registration endpoint
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const passwordValidation = validatePassword(password);
      if (!isPasswordValid(password)) {
        return res.status(400).json({ 
          message: "A senha não atende aos requisitos mínimos de segurança",
          feedback: passwordValidation.feedback,
          strength: passwordValidation.strength
        });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: 'customer',
      });

      // Auto-subscribe as lead (registered but no purchase yet)
      try {
        await storage.createOrUpdateSubscriber(
          username.toLowerCase(),
          username.split('@')[0],
          'lead'
        );
      } catch (subErr) {
        console.error("Failed to auto-subscribe customer:", subErr);
      }
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
        message: "Cadastro realizado com sucesso! Você pode fazer login agora.",
      });
    } catch (err) {
      next(err);
    }
  });


  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      const user = await storage.getUserByUsername(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ message: "Se o email existir em nossa base, você receberá um link de recuperação." });
      }
      
      // Delete old reset tokens
      await storage.deletePasswordResetTokensByUserId(user.id);
      
      // Create new reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
        createdAt: new Date().toISOString(),
      });
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      try {
        await sendPasswordResetEmail(email, resetToken, baseUrl);
      } catch (emailErr) {
        console.error("Failed to send password reset email:", emailErr);
      }
      
      res.json({ message: "Se o email existir em nossa base, você receberá um link de recuperação." });
    } catch (err) {
      next(err);
    }
  });

  // Validate reset token
  app.get("/api/auth/validate-reset-token", async (req, res, next) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: "Token inválido" });
      }
      
      const tokenData = await storage.getPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ valid: false, message: "Token inválido ou já utilizado" });
      }
      
      if (new Date(tokenData.expiresAt) < new Date()) {
        return res.status(400).json({ valid: false, message: "Token expirado" });
      }
      
      res.json({ valid: true });
    } catch (err) {
      next(err);
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res, next) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
      }
      
      const passwordValidation = validatePassword(password);
      if (!isPasswordValid(password)) {
        return res.status(400).json({ 
          message: "A senha não atende aos requisitos mínimos de segurança",
          feedback: passwordValidation.feedback,
          strength: passwordValidation.strength
        });
      }
      
      const tokenData = await storage.getPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ message: "Token inválido ou já utilizado" });
      }
      
      if (new Date(tokenData.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Token expirado. Por favor, solicite um novo link de recuperação." });
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(tokenData.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(tokenData.id);
      
      res.json({ message: "Senha alterada com sucesso! Você já pode fazer login." });
    } catch (err) {
      next(err);
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: user.id,
          username: user.username,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Check auth status
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user!.id,
        username: req.user!.username,
        role: req.user!.role,
      });
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  // ============ ADMIN MANAGEMENT ROUTES ============
  const PRIMARY_ADMIN_EMAIL = "betoyes@gmail.com";

  // Get all admins (only primary admin can access)
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Apenas o administrador principal pode gerenciar outros administradores." });
      }
      const admins = await storage.getAdminUsers();
      res.json(admins.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
    } catch (err) {
      next(err);
    }
  });

  // Add new admin (only primary admin can do this)
  app.post("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Apenas o administrador principal pode adicionar administradores." });
      }
      
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: 'admin',
      });
      
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      next(err);
    }
  });

  // Delete admin (only primary admin, cannot delete self)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Apenas o administrador principal pode remover administradores." });
      }
      
      const id = parseInt(req.params.id);
      const userToDelete = await storage.getUser(id);
      
      if (!userToDelete) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      if (userToDelete.username === PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Não é possível remover o administrador principal" });
      }
      
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ CATEGORIES ROUTES ============
  
  app.get("/api/categories", async (req, res, next) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/categories/:slug", async (req, res, next) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      res.json(category);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/categories", requireAuth, async (req, res, next) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.updateCategory(id, req.body);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      res.json(category);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ COLLECTIONS ROUTES ============
  
  app.get("/api/collections", async (req, res, next) => {
    try {
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/collections/:slug", async (req, res, next) => {
    try {
      const collection = await storage.getCollectionBySlug(req.params.slug);
      if (!collection) {
        return res.status(404).json({ message: "Coleção não encontrada" });
      }
      res.json(collection);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/collections", requireAuth, async (req, res, next) => {
    try {
      const data = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(data);
      res.status(201).json(collection);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/collections/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.updateCollection(id, req.body);
      if (!collection) {
        return res.status(404).json({ message: "Coleção não encontrada" });
      }
      res.json(collection);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/collections/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCollection(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ PRODUCTS ROUTES ============
  
  app.get("/api/products", async (req, res, next) => {
    try {
      const { category, collection, bestsellers, new: isNew } = req.query;
      
      let products;
      if (bestsellers === 'true') {
        products = await storage.getBestsellers();
      } else if (isNew === 'true') {
        products = await storage.getNewProducts();
      } else if (category) {
        const cat = await storage.getCategoryBySlug(category as string);
        if (cat) {
          products = await storage.getProductsByCategory(cat.id);
        } else {
          products = [];
        }
      } else if (collection) {
        const col = await storage.getCollectionBySlug(collection as string);
        if (col) {
          products = await storage.getProductsByCollection(col.id);
        } else {
          products = [];
        }
      } else {
        products = await storage.getProducts();
      }
      
      res.json(products);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/products", requireAuth, async (req, res, next) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/products/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.updateProduct(id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ JOURNAL POSTS ROUTES ============
  
  app.get("/api/journal", async (req, res, next) => {
    try {
      const posts = await storage.getJournalPosts();
      res.json(posts);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/journal/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getJournalPostById(id);
      if (!post) {
        return res.status(404).json({ message: "Post não encontrado" });
      }
      res.json(post);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/journal", requireAuth, async (req, res, next) => {
    try {
      const data = insertJournalPostSchema.parse(req.body);
      const post = await storage.createJournalPost(data);
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/journal/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.updateJournalPost(id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Post não encontrado" });
      }
      res.json(post);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/journal/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteJournalPost(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ SUBSCRIBERS ROUTES ============
  
  app.get("/api/subscribers", requireAuth, async (req, res, next) => {
    try {
      const { type } = req.query;
      let subscribersList;
      if (type && typeof type === 'string') {
        subscribersList = await storage.getSubscribersByType(type);
      } else {
        subscribersList = await storage.getSubscribers();
      }
      res.json(subscribersList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/subscribers", async (req, res, next) => {
    try {
      const data = insertSubscriberSchema.parse(req.body);
      
      // Check if email already exists
      const existing = await storage.getSubscriberByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      
      // Default type is 'newsletter' for signups from the site footer
      const subscriber = await storage.createSubscriber({
        ...data,
        type: data.type || 'newsletter',
      });
      res.status(201).json(subscriber);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/subscribers/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const subscriber = await storage.updateSubscriber(id, req.body);
      if (!subscriber) {
        return res.status(404).json({ message: "Assinante não encontrado" });
      }
      res.json(subscriber);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/subscribers/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubscriber(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // Bulk import subscribers (admin only)
  app.post("/api/subscribers/import", requireAdmin, async (req, res, next) => {
    try {
      const { subscribers: subscribersList } = req.body;
      
      if (!Array.isArray(subscribersList) || subscribersList.length === 0) {
        return res.status(400).json({ message: "Lista de assinantes vazia ou inválida" });
      }

      const today = new Date().toISOString().split('T')[0];
      const validSubscribers = subscribersList
        .filter((sub: any) => sub.email && typeof sub.email === 'string' && sub.email.includes('@'))
        .map((sub: any) => ({
          name: (sub.name || sub.email.split('@')[0]).trim(),
          email: sub.email.toLowerCase().trim(),
          date: sub.date || today,
          status: 'active',
        }));

      if (validSubscribers.length === 0) {
        return res.status(400).json({ message: "Nenhum email válido encontrado na lista" });
      }

      const result = await storage.createSubscribersBulk(validSubscribers);
      
      res.json({
        message: `Importação concluída: ${result.inserted} adicionados, ${result.skipped} já existentes ou inválidos`,
        inserted: result.inserted,
        skipped: result.skipped,
        total: subscribersList.length,
      });
    } catch (err) {
      next(err);
    }
  });

  // ============ CUSTOMERS ROUTES ============
  
  app.get("/api/customers", requireAuth, async (req, res, next) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/customers", requireAuth, async (req, res, next) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/customers/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.updateCustomer(id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(customer);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ ORDERS ROUTES ============
  
  app.get("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(data);
      
      // Upgrade or create subscriber as customer when order is created
      if (data.customerId) {
        try {
          const customer = await storage.getCustomerById(data.customerId);
          if (customer?.email) {
            // Use createOrUpdateSubscriber to ensure customer is added/upgraded
            await storage.createOrUpdateSubscriber(
              customer.email,
              customer.name,
              'customer'
            );
          }
        } catch (subErr) {
          console.error("Failed to upgrade subscriber to customer:", subErr);
        }
      }
      
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.updateOrder(id, req.body);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/orders/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOrder(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ BRANDING ROUTES ============
  
  app.get("/api/branding", async (req, res, next) => {
    try {
      const branding = await storage.getBranding();
      if (!branding) {
        return res.status(404).json({ message: "Branding não configurado" });
      }
      res.json(branding);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/branding", requireAuth, async (req, res, next) => {
    try {
      const data = insertBrandingSchema.parse(req.body);
      const branding = await storage.createOrUpdateBranding(data);
      res.json(branding);
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}
