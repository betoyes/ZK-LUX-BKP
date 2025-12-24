import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, logAuditEvent } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
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

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: "Muitas tentativas de alteração de senha. Tente novamente em 15 minutos." },
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

// Helper to hash tokens with SHA256
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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
  
  // Validate SESSION_SECRET in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production environment");
  }
  
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  // Initialize PostgreSQL session store
  const PgSession = connectPgSimple(session);
  
  // Session configuration with PostgreSQL store
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
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

  // Customer registration endpoint (no CSRF - user not authenticated yet)
  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
      // Generate random token, store ONLY the hash, send raw token via email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      await storage.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
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
      
      // Hash the received token and compare to stored hash
      const tokenHash = hashToken(token);
      const tokenData = await storage.getEmailVerificationTokenByHash(tokenHash);
      
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

  // Resend verification email (no CSRF - user not authenticated yet)
  app.post("/api/auth/resend-verification", resendVerificationLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
      
      // Create new verification token - store only hash, send raw token via email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      await storage.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
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

  // Request password reset (no CSRF - user not authenticated yet)
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
      
      // Invalidate (mark as used) all previous reset tokens for this user
      await storage.invalidatePasswordResetTokensByUserId(user.id);
      
      // Create new reset token - store only hash, send raw token via email
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
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
      
      // Hash the received token and compare to stored hash
      const tokenHash = hashToken(token);
      const tokenData = await storage.getPasswordResetTokenByHash(tokenHash);
      
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

  // Reset password (no CSRF - user not authenticated yet)
  app.post("/api/auth/reset-password", resetPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
      
      // Hash the received token and compare to stored hash
      const tokenHash = hashToken(token);
      const tokenData = await storage.getPasswordResetTokenByHash(tokenHash);
      
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

  // Login (no CSRF - user not authenticated yet)
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

  // Change password (logged in user)
  app.post("/api/auth/change-password", changePasswordLimiter, csrfProtection, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      
      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        await logAuditEvent(userId, 'change_password_failed', clientIp, userAgent, { reason: 'wrong_current_password' });
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      if (currentPassword === newPassword) {
        return res.status(400).json({ message: "A nova senha deve ser diferente da senha atual" });
      }
      
      const passwordValidation = validatePassword(newPassword);
      if (!isPasswordValid(newPassword)) {
        return res.status(400).json({ 
          message: "A nova senha não atende aos requisitos mínimos de segurança",
          feedback: passwordValidation.feedback
        });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUserPassword(userId, hashedPassword);
      
      await logAuditEvent(userId, 'change_password', clientIp, userAgent);
      
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
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
  const PRIMARY_ADMIN_EMAIL = process.env.PRIMARY_ADMIN_EMAIL || 
    (process.env.NODE_ENV === "production" 
      ? (() => { throw new Error("PRIMARY_ADMIN_EMAIL must be set in production"); })() 
      : "admin@localhost");

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
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
      
      // Check if category has products before deleting
      const categoryProducts = await storage.getProductsByCategory(id);
      if (categoryProducts && categoryProducts.length > 0) {
        return res.status(400).json({ 
          message: `Não é possível excluir esta categoria. Existem ${categoryProducts.length} produto(s) associado(s). Remova ou mova os produtos primeiro.` 
        });
      }
      
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ COLLECTIONS ROUTES ============
  
  app.get("/api/collections", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
  
  // Helper to strip base64 images and replace with API URLs with cache buster
  const stripBase64Images = (products: any[], cacheBuster?: string) => {
    const v = cacheBuster || '';
    return products.map(p => ({
      ...p,
      image: p.image?.startsWith('data:') ? `/api/products/${p.id}/image${v}` : p.image,
      imageColor: p.imageColor?.startsWith('data:') ? `/api/products/${p.id}/image-color${v}` : p.imageColor,
      version1: p.version1?.startsWith('data:') ? `/api/products/${p.id}/version1${v}` : p.version1,
      version2: p.version2?.startsWith('data:') ? `/api/products/${p.id}/version2${v}` : p.version2,
      version3: p.version3?.startsWith('data:') ? `/api/products/${p.id}/version3${v}` : p.version3,
    }));
  };
  
  // Helper for single product
  const stripBase64ImagesFromProduct = (p: any, cacheBuster?: string) => {
    const v = cacheBuster || '';
    return {
      ...p,
      image: p.image?.startsWith('data:') ? `/api/products/${p.id}/image${v}` : p.image,
      imageColor: p.imageColor?.startsWith('data:') ? `/api/products/${p.id}/image-color${v}` : p.imageColor,
      version1: p.version1?.startsWith('data:') ? `/api/products/${p.id}/version1${v}` : p.version1,
      version2: p.version2?.startsWith('data:') ? `/api/products/${p.id}/version2${v}` : p.version2,
      version3: p.version3?.startsWith('data:') ? `/api/products/${p.id}/version3${v}` : p.version3,
    };
  };

  app.get("/api/products", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      const { category, collection, bestsellers, new: isNew, full } = req.query;
      
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
      
      // Strip base64 images to reduce payload size (unless full=true is requested)
      if (full !== 'true') {
        products = stripBase64Images(products);
      }
      
      res.json(products);
    } catch (err) {
      next(err);
    }
  });

  // Serve product images separately
  app.get("/api/products/:id/image", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product || !product.image) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      // Detect circular reference (image pointing to itself)
      if (product.image.includes(`/api/products/${id}/image`)) {
        return res.status(404).json({ message: "Imagem não configurada corretamente - favor reupar a imagem" });
      }
      
      // If it's base64, decode and send as image
      if (product.image.startsWith('data:')) {
        const matches = product.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.set('Content-Type', mimeType);
          return res.send(buffer);
        }
      }
      
      // If it's a URL, redirect to it
      res.redirect(product.image);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/products/:id/image-color", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product || !product.imageColor) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      // Detect circular reference
      if (product.imageColor.includes(`/api/products/${id}/image`)) {
        return res.status(404).json({ message: "Imagem não configurada corretamente - favor reupar a imagem" });
      }
      
      // If it's base64, decode and send as image
      if (product.imageColor.startsWith('data:')) {
        const matches = product.imageColor.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.set('Content-Type', mimeType);
          return res.send(buffer);
        }
      }
      
      // If it's a URL, redirect to it
      res.redirect(product.imageColor);
    } catch (err) {
      next(err);
    }
  });

  // Generic endpoint for version images
  app.get("/api/products/:id/:field(version1|version2|version3)", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      const id = parseInt(req.params.id);
      const field = req.params.field as 'version1' | 'version2' | 'version3';
      const product = await storage.getProductById(id);
      if (!product || !product[field]) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      const imageData = product[field];
      
      // Detect circular reference
      if (imageData.includes(`/api/products/${id}/${field}`)) {
        return res.status(404).json({ message: "Imagem não configurada corretamente - favor reupar a imagem" });
      }
      
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.set('Content-Type', mimeType);
          return res.send(buffer);
        }
      }
      
      res.redirect(imageData);
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
      const cacheBuster = `?v=${Date.now()}`;
      res.status(201).json(stripBase64ImagesFromProduct(product, cacheBuster));
    } catch (err) {
      next(err);
    }
  });

  // Clone product to Noivas category
  app.post("/api/products/:id/clone-noivas", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const original = await storage.getProductById(id);
      if (!original) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      // Find Noivas category
      const noivasCategory = await storage.getCategoryBySlug('noivas');
      if (!noivasCategory) {
        return res.status(400).json({ message: "Categoria Noivas não encontrada" });
      }
      
      // Clone product with Noivas category
      const cloneData = {
        name: `${original.name} - Noivas`,
        price: original.price,
        description: original.description,
        image: original.image,
        imageColor: original.imageColor,
        gallery: original.gallery,
        video: original.video,
        video2: original.video2,
        version1: original.version1,
        version2: original.version2,
        version3: original.version3,
        categoryId: noivasCategory.id,
        collectionId: original.collectionId,
        specs: original.specs,
        bestsellerOrder: null,
        isNew: original.isNew,
        priceDiamondSynthetic: original.priceDiamondSynthetic,
        priceZirconia: original.priceZirconia,
        descriptionDiamondSynthetic: original.descriptionDiamondSynthetic,
        descriptionZirconia: original.descriptionZirconia,
        specsDiamondSynthetic: original.specsDiamondSynthetic,
        specsZirconia: original.specsZirconia,
        mainStoneName: original.mainStoneName,
        stoneVariations: original.stoneVariations,
      };
      
      const clonedProduct = await storage.createProduct(cloneData);
      const cacheBuster = `?v=${Date.now()}`;
      res.status(201).json(stripBase64ImagesFromProduct(clonedProduct, cacheBuster));
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
      // Return with cache buster to force browser to reload images
      const cacheBuster = `?v=${Date.now()}`;
      res.json(stripBase64ImagesFromProduct(product, cacheBuster));
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
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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

  // ============ CONFIG ROUTES ============

  app.get("/api/config/whatsapp", (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      number: process.env.WHATSAPP_NUMBER || '5511999999999',
      message: process.env.WHATSAPP_MESSAGE || 'Olá! Gostaria de saber mais sobre as joias ZK REZK.',
    });
  });

  // ============ BRANDING ROUTES ============
  
  app.get("/api/branding", async (req, res, next) => {
    try {
      res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
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

  // ============ LGPD COMPLIANCE ROUTES ============

  // Rate limiter for data export requests (1 per day)
  const dataExportLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1,
    message: { message: "Você já solicitou uma exportação de dados hoje. Tente novamente amanhã." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // GET /api/lgpd/consent-history - Returns user's consent data and audit history
  app.get("/api/lgpd/consent-history", requireAuth, async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { user, auditLogs } = await storage.getUserConsentHistory(userId);
      
      res.json({
        consentData: {
          consentMarketing: user.consentMarketing,
          consentTerms: user.consentTerms,
          consentPrivacy: user.consentPrivacy,
          consentAt: user.consentAt,
          createdAt: user.createdAt,
        },
        auditHistory: auditLogs.map(log => ({
          action: log.action,
          details: log.details ? JSON.parse(log.details) : null,
          createdAt: log.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/lgpd/consent - Updates consent preferences
  app.patch("/api/lgpd/consent", requireAuth, csrfProtection, async (req: any, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const userId = req.user.id;
      const { consentMarketing, consentTerms, consentPrivacy } = req.body;
      
      // Get current values for audit log
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const oldValues = {
        consentMarketing: currentUser.consentMarketing,
        consentTerms: currentUser.consentTerms,
        consentPrivacy: currentUser.consentPrivacy,
      };
      
      const newValues: { consentMarketing?: boolean; consentTerms?: boolean; consentPrivacy?: boolean } = {};
      if (typeof consentMarketing === 'boolean') newValues.consentMarketing = consentMarketing;
      if (typeof consentTerms === 'boolean') newValues.consentTerms = consentTerms;
      if (typeof consentPrivacy === 'boolean') newValues.consentPrivacy = consentPrivacy;
      
      if (Object.keys(newValues).length === 0) {
        return res.status(400).json({ message: "Nenhuma preferência de consentimento fornecida" });
      }
      
      const updatedUser = await storage.updateUserConsent(userId, newValues);
      
      // Log audit event
      await logAuditEvent(userId, 'consent_update', clientIp, userAgent, {
        oldValues,
        newValues,
      });
      
      res.json({
        message: "Preferências de consentimento atualizadas com sucesso",
        consentData: {
          consentMarketing: updatedUser.consentMarketing,
          consentTerms: updatedUser.consentTerms,
          consentPrivacy: updatedUser.consentPrivacy,
          consentAt: updatedUser.consentAt,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/lgpd/data-export - Creates a data export request
  app.post("/api/lgpd/data-export", requireAuth, csrfProtection, async (req: any, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const userId = req.user.id;
      
      // Check for recent request (rate limiting at storage level)
      const recentRequest = await storage.getRecentDataExportRequest(userId, 24);
      if (recentRequest) {
        return res.status(429).json({ 
          message: "Você já solicitou uma exportação de dados nas últimas 24 horas. Tente novamente mais tarde.",
          existingRequestId: recentRequest.id,
          status: recentRequest.status,
        });
      }
      
      const request = await storage.createDataExportRequest(userId);
      
      // Log audit event
      await logAuditEvent(userId, 'data_export_request', clientIp, userAgent, {
        requestId: request.id,
      });
      
      res.status(201).json({
        message: "Solicitação de exportação de dados criada com sucesso. Você pode gerar o arquivo agora.",
        requestId: request.id,
        status: request.status,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/lgpd/data-export/:requestId - Returns status of data export request
  app.get("/api/lgpd/data-export/:requestId", requireAuth, async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.requestId);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      const request = await storage.getDataExportRequest(requestId, userId);
      
      if (!request) {
        return res.status(404).json({ message: "Solicitação de exportação não encontrada" });
      }
      
      const response: any = {
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        completedAt: request.completedAt,
      };
      
      // Include download URL only if completed and not expired
      if (request.status === 'completed' && request.downloadUrl && request.expiresAt) {
        if (new Date(request.expiresAt) > new Date()) {
          response.downloadUrl = request.downloadUrl;
          response.expiresAt = request.expiresAt;
        } else {
          response.message = "O link de download expirou. Solicite uma nova exportação.";
        }
      }
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/lgpd/data-export/:requestId/generate - Generates the data export file
  app.post("/api/lgpd/data-export/:requestId/generate", requireAuth, csrfProtection, async (req: any, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.requestId);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      const request = await storage.getDataExportRequest(requestId, userId);
      
      if (!request) {
        return res.status(404).json({ message: "Solicitação de exportação não encontrada" });
      }
      
      if (request.status === 'completed') {
        return res.status(400).json({ message: "Esta exportação já foi gerada" });
      }
      
      // Update status to processing
      await storage.updateDataExportRequest(requestId, { status: 'processing' });
      
      // Collect all user data
      const allData = await storage.getAllUserData(userId);
      
      // Create export package
      const exportData = {
        exportedAt: new Date().toISOString(),
        dataSubject: {
          id: allData.user.id,
          email: allData.user.email,
          username: allData.user.username,
          createdAt: allData.user.createdAt,
          emailVerified: allData.user.emailVerified,
          emailVerifiedAt: allData.user.emailVerifiedAt,
          phone: allData.user.phone,
          role: allData.user.role,
        },
        consents: {
          marketing: allData.user.consentMarketing,
          terms: allData.user.consentTerms,
          privacy: allData.user.consentPrivacy,
          consentAt: allData.user.consentAt,
        },
        orders: allData.orders,
        subscription: allData.subscriber,
        auditLog: allData.auditLogs.map(log => ({
          action: log.action,
          createdAt: log.createdAt,
          ipAddress: log.ipAddress,
        })),
        previousExportRequests: allData.dataExportRequests.filter(r => r.id !== requestId).map(r => ({
          id: r.id,
          status: r.status,
          requestedAt: r.requestedAt,
        })),
      };
      
      // Create base64 encoded JSON as download URL
      const jsonContent = JSON.stringify(exportData, null, 2);
      const base64Content = Buffer.from(jsonContent).toString('base64');
      const downloadUrl = `data:application/json;base64,${base64Content}`;
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Update request with completed status
      const updatedRequest = await storage.updateDataExportRequest(requestId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        downloadUrl,
        expiresAt,
      });
      
      // Log audit event
      await logAuditEvent(userId, 'data_export_generated', clientIp, userAgent, {
        requestId,
      });
      
      res.json({
        message: "Exportação de dados gerada com sucesso",
        id: requestId,
        status: 'completed',
        downloadUrl,
        expiresAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/lgpd/account - Deletes or anonymizes account
  app.delete("/api/lgpd/account", requireAuth, csrfProtection, async (req: any, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      const userId = req.user.id;
      const { password, mode } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Senha é obrigatória para confirmar esta ação" });
      }
      
      if (!mode || !['anonymize', 'delete'].includes(mode)) {
        return res.status(400).json({ message: "Modo inválido. Use 'anonymize' ou 'delete'" });
      }
      
      // Verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Senha incorreta" });
      }
      
      let result;
      let auditAction;
      let responseMessage;
      
      if (mode === 'anonymize') {
        result = await storage.anonymizeUser(userId);
        auditAction = 'account_anonymize';
        responseMessage = "Sua conta foi anonimizada. Todos os seus dados pessoais foram removidos.";
      } else {
        result = await storage.softDeleteUser(userId);
        auditAction = 'account_delete';
        responseMessage = "Sua conta foi marcada para exclusão. Os dados serão removidos permanentemente em 30 dias.";
      }
      
      // Log audit event before invalidating session
      await logAuditEvent(userId, auditAction, clientIp, userAgent, {
        mode,
        email: user.email,
      });
      
      // Invalidate session
      req.logout(() => {
        req.session?.destroy(() => {});
      });
      
      res.json({
        message: responseMessage,
        mode,
        processedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/lgpd/data - Returns all personal data for transparency
  app.get("/api/lgpd/data", requireAuth, async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const allData = await storage.getAllUserData(userId);
      
      res.json({
        profile: {
          id: allData.user.id,
          email: allData.user.email,
          username: allData.user.username,
          phone: allData.user.phone,
          role: allData.user.role,
          createdAt: allData.user.createdAt,
          emailVerified: allData.user.emailVerified,
          emailVerifiedAt: allData.user.emailVerifiedAt,
          lastLoginAt: allData.user.lastLoginAt,
        },
        consents: {
          marketing: allData.user.consentMarketing,
          terms: allData.user.consentTerms,
          privacy: allData.user.consentPrivacy,
          consentAt: allData.user.consentAt,
        },
        accountStatus: {
          deletedAt: allData.user.deletedAt,
          anonymizedAt: allData.user.anonymizedAt,
          retentionExpiresAt: allData.user.retentionExpiresAt,
        },
        orders: allData.orders.map(order => ({
          id: order.id,
          orderId: order.orderId,
          date: order.date,
          status: order.status,
          total: order.total,
          items: order.items,
        })),
        subscription: allData.subscriber ? {
          email: allData.subscriber.email,
          type: allData.subscriber.type,
          status: allData.subscriber.status,
          date: allData.subscriber.date,
        } : null,
        auditLogSummary: {
          totalEvents: allData.auditLogs.length,
          recentEvents: allData.auditLogs.slice(0, 10).map(log => ({
            action: log.action,
            createdAt: log.createdAt,
          })),
        },
        dataExportRequests: allData.dataExportRequests.map(req => ({
          id: req.id,
          status: req.status,
          requestedAt: req.requestedAt,
          completedAt: req.completedAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // ============ SEO ROUTES ============

  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /privacy
Disallow: /verify-email
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${baseUrl}/sitemap.xml
`);
  });

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const products = await storage.getProducts();
      const categories = await storage.getCategories();
      const collections = await storage.getCollections();
      const journalPosts = await storage.getJournalPosts();

      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/shop', priority: '0.9', changefreq: 'daily' },
        { url: '/collections', priority: '0.8', changefreq: 'weekly' },
        { url: '/lookbook', priority: '0.7', changefreq: 'weekly' },
        { url: '/journal', priority: '0.7', changefreq: 'weekly' },
        { url: '/noivas', priority: '0.7', changefreq: 'weekly' },
        { url: '/atelier', priority: '0.7', changefreq: 'monthly' },
        { url: '/manifesto', priority: '0.6', changefreq: 'monthly' },
        { url: '/about', priority: '0.6', changefreq: 'monthly' },
        { url: '/contact', priority: '0.5', changefreq: 'monthly' },
        { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
        { url: '/terms-of-use', priority: '0.3', changefreq: 'yearly' },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

      for (const page of staticPages) {
        xml += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }

      for (const product of products) {
        xml += `  <url>
    <loc>${baseUrl}/product/${product.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      for (const post of journalPosts) {
        xml += `  <url>
    <loc>${baseUrl}/journal/${post.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }

      xml += `</urlset>`;

      res.type('application/xml');
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}
