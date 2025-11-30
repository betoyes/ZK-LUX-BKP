import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  insertUserSchema, insertCategorySchema, insertCollectionSchema,
  insertProductSchema, insertJournalPostSchema, insertSubscriberSchema,
  insertCustomerSchema, insertOrderSchema, insertBrandingSchema,
  type User,
} from "@shared/schema";

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
  
  // Register (only for initial setup)
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });
      
      res.status(201).json({
        id: user.id,
        username: user.username,
      });
    } catch (err) {
      next(err);
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
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
      const subscribers = await storage.getSubscribers();
      res.json(subscribers);
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
      
      const subscriber = await storage.createSubscriber(data);
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
