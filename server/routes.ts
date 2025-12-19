import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, logAuditEvent } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  insertUserSchema, insertCategorySchema, insertCollectionSchema,
  insertProductSchema, insertJournalPostSchema, insertSubscriberSchema,
  insertCustomerSchema, insertOrderSchema, insertBrandingSchema,
  registerUserSchema, loginUserSchema,
  type User,
} from "@shared/schema";
import { sendPasswordResetEmail, sendAdminNotification, sendVerificationEmail } from "./email";
import { validatePassword, isPasswordValid } from "../shared/passwordStrength";

// Rate limiters for authentication routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Muitas tentativas de cadastro. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Muitas solicitações de recuperação de senha. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: "Muitas tentativas de redefinição de senha. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Muitas solicitações de reenvio. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to get client IP
function getClientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
}

// Helper to get user agent
function getUserAgent(req: Request): string | null {
  return req.headers['user-agent'] || null;
}

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

  // CSRF token generation - generate on session creation
  app.use((req: any, res: Response, next: NextFunction) => {
    if (req.session && !req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    next();
  });

  // CSRF validation middleware for auth POST/PATCH/DELETE routes
  const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    const csrfToken = req.headers['x-csrf-token'];
    
    if (!session?.csrfToken) {
      return res.status(403).json({ message: "Sessão inválida. Atualize a página e tente novamente." });
    }
    
    if (!csrfToken || csrfToken !== session.csrfToken) {
      return res.status(403).json({ message: "Token CSRF inválido. Atualize a página e tente novamente." });
    }
    
    next();
  };

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
  
  // CSRF Token endpoint
  app.get("/api/auth/csrf-token", (req: any, res: Response) => {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Customer registration endpoint
  app.post("/api/auth/register", registerLimiter, csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      // Validate input with Zod schema
      const validationResult = registerUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message);
        return res.status(400).json({ 
          message: "Erro de validação",
          errors: errors
        });
      }
      
      const { username, email, password, consentTerms, consentPrivacy, consentMarketing } = validationResult.data;
      
      const passwordValidation = validatePassword(password);
      if (!isPasswordValid(password)) {
        return res.status(400).json({ 
          message: "A senha não atende aos requisitos mínimos de segurança",
          feedback: passwordValidation.feedback,
          strength: passwordValidation.strength
        });
      }
      
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        username: email,
        password: hashedPassword,
        role: 'customer',
        email,
        consentTerms,
        consentPrivacy,
        consentMarketing: consentMarketing || false,
      });

      // Log audit event
      await logAuditEvent(user.id, 'register', clientIp, userAgent, { email });

      // Auto-subscribe as lead (registered but no purchase yet)
      try {
        await storage.createOrUpdateSubscriber(
          email.toLowerCase(),
          username || email.split('@')[0],
          'lead'
        );
      } catch (subErr) {
        console.error("Failed to auto-subscribe customer:", subErr);
      }
      
      // Send admin notification for new lead
      sendAdminNotification('lead', { 
        email, 
        name: username || email.split('@')[0] 
      }).catch(err => console.error('Failed to send lead notification:', err));
      
      // Create email verification token and send verification email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt,
        createdAt: new Date().toISOString(),
      });
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      try {
        await sendVerificationEmail(email, verificationToken, baseUrl);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
        message: "Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.",
      });
    } catch (err) {
      next(err);
    }
  });

  // Verify email
  app.get("/api/auth/verify-email", async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token de verificação inválido" });
      }
      
      const tokenData = await storage.getEmailVerificationToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ message: "Token inválido ou já utilizado" });
      }
      
      if (new Date(tokenData.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Token expirado. Solicite um novo email de verificação." });
      }
      
      // Mark user as verified
      await storage.updateUserEmailVerified(tokenData.userId, true);
      
      // Delete the used token
      await storage.deleteEmailVerificationTokensByUserId(tokenData.userId);
      
      // Log audit event
      await logAuditEvent(tokenData.userId, 'email_verified', clientIp, userAgent);
      
      res.json({ message: "Email verificado com sucesso! Você já pode fazer login." });
    } catch (err) {
      next(err);
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", resendVerificationLimiter, csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Email válido é obrigatório" });
      }
      
      const user = await storage.getUserByEmail(email) || await storage.getUserByUsername(email);
      
      if (!user) {
        // Return success for security (don't reveal if email exists)
        return res.json({ message: "Se o email existir em nossa base, você receberá um novo link de verificação." });
      }
      
      if (user.emailVerified) {
        return res.json({ message: "Este email já foi verificado. Você pode fazer login normalmente." });
      }
      
      // Delete old verification tokens
      await storage.deleteEmailVerificationTokensByUserId(user.id);
      
      // Create new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt,
        createdAt: new Date().toISOString(),
      });
      
      // Send verification email
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      try {
        await sendVerificationEmail(user.email || email, verificationToken, baseUrl);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
      
      // Log audit event
      await logAuditEvent(user.id, 'verification_email_resent', clientIp, userAgent);
      
      res.json({ message: "Se o email existir em nossa base, você receberá um novo link de verificação." });
    } catch (err) {
      next(err);
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Email válido é obrigatório" });
      }
      
      const user = await storage.getUserByUsername(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ message: "Se o email existir em nossa base, você receberá um link de recuperação." });
      }
      
      // Log audit event
      await logAuditEvent(user.id, 'password_reset_request', clientIp, userAgent, { email });
      
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
  app.post("/api/auth/reset-password", resetPasswordLimiter, csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
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
      
      // Invalidate all password reset tokens for this user (marks them as used)
      await storage.invalidatePasswordResetTokensByUserId(tokenData.userId);
      
      // Log audit event
      await logAuditEvent(tokenData.userId, 'password_reset_complete', clientIp, userAgent);
      
      res.json({ message: "Senha alterada com sucesso! Você já pode fazer login." });
    } catch (err) {
      next(err);
    }
  });

  // Login
  app.post("/api/auth/login", loginLimiter, csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    // Validate input with Zod schema
    const validationResult = loginUserSchema.safeParse({
      usernameOrEmail: req.body.username || req.body.usernameOrEmail,
      password: req.body.password
    });
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message);
      return res.status(400).json({ 
        message: "Erro de validação",
        errors: errors
      });
    }
    
    passport.authenticate("local", async (err: any, user: Express.User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // Log failed login attempt
        const attemptedUser = await storage.getUserByUsername(req.body.username);
        await logAuditEvent(
          attemptedUser?.id || null,
          'login_failed',
          clientIp,
          userAgent,
          { username: req.body.username, reason: info?.message }
        );
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      // Check email verification (admins are exempt)
      if (user.role !== 'admin') {
        const fullUser = await storage.getUser(user.id);
        if (fullUser && !fullUser.emailVerified) {
          await logAuditEvent(
            user.id,
            'login_failed',
            clientIp,
            userAgent,
            { reason: 'email_not_verified' }
          );
          return res.status(403).json({ 
            message: "Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada.",
            code: "EMAIL_NOT_VERIFIED"
          });
        }
      }
      
      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }
        
        // Log successful login
        await logAuditEvent(user.id, 'login', clientIp, userAgent);
        
        return res.json({
          id: user.id,
          username: user.username,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", csrfProtection, (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    const userId = (req as any).user?.id;
    
    req.logout(async () => {
      // Log logout event
      if (userId) {
        await logAuditEvent(userId, 'logout', clientIp, userAgent);
      }
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
      
      let products: any[] = [];
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
      // Add date and name defaults before validation
      const bodyWithDefaults = {
        ...req.body,
        date: req.body.date || new Date().toISOString().split('T')[0],
        name: req.body.name || '',
      };
      const data = insertSubscriberSchema.parse(bodyWithDefaults);
      
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
      
      // Send admin notification for new newsletter subscriber
      sendAdminNotification('newsletter', { 
        email: data.email, 
        name: data.name 
      }).catch(err => console.error('Failed to send newsletter notification:', err));
      
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
      
      // Send admin notification for new customer
      sendAdminNotification('customer', { 
        email: data.email, 
        name: data.name 
      }).catch(err => console.error('Failed to send customer notification:', err));
      
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
      let customerEmail = '';
      let customerName = data.customer;
      if (data.customerId) {
        try {
          const customer = await storage.getCustomerById(data.customerId);
          if (customer?.email) {
            customerEmail = customer.email;
            customerName = customer.name;
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
      
      // Send admin notification for new order/sale
      sendAdminNotification('order', { 
        orderId: data.orderId,
        name: customerName,
        email: customerEmail,
        total: data.total,
        items: data.items
      }).catch(err => console.error('Failed to send order notification:', err));
      
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
