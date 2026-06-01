import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, logAuditEvent } from "./storage";
import { adminLargeJsonParser, adminLargeUrlencodedParser } from "./parsers";
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
  insertUserSchema,
  insertCategorySchema,
  insertCollectionSchema,
  insertProductSchema,
  insertJournalPostSchema,
  insertSubscriberSchema,
  insertCustomerSchema,
  insertOrderSchema,
  insertBrandingSchema,
  registerUserSchema,
  loginUserSchema,
  createPixPaymentSchema,
  createCreditCardPaymentSchema,
  updateUserProfileSchema,
  type User,
} from "@shared/schema";
import {
  sendPasswordResetEmail,
  sendAdminNotification,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
} from "./email";
import { validatePassword, isPasswordValid } from "../shared/passwordStrength";
import * as asaas from "./asaas";
import { calculateShippingFromCep, calculateInstallmentWithInterest } from "./pricing";

// Rate limiters for authentication routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 10,
  message: {
    message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 50 : 10,
  message: {
    message: "Muitas tentativas de cadastro. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    message:
      "Muitas solicitações de recuperação de senha. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message:
      "Muitas tentativas de redefinição de senha. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    message: "Muitas solicitações de reenvio. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message:
      "Muitas tentativas de alteração de senha. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const subscriberLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 50 : 10,
  message: {
    message: "Muitas tentativas de inscrição. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Permissive limiter for public read-only catalog endpoints.
// High enough to never bother a real user or browser, low enough to
// slow down automated scrapers and abuse bots.
const publicCatalogLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 300 : 120,
  message: {
    message: "Muitas requisições. Tente novamente em instantes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// In-process sitemap cache — avoids full-table reads on every request.
// The sitemap changes only when products/collections/posts change,
// so a 10-minute TTL is a safe trade-off between freshness and DB load.
let sitemapCache: { xml: string; expiresAt: number } | null = null;
const SITEMAP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Stricter limiter for the sitemap endpoint — it triggers full-table reads so
// should not be fetched at high frequency by bots or scrapers.
const sitemapLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 60 : 10,
  message: {
    message: "Muitas requisições. Tente novamente em instantes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for the CSRF-token endpoint — prevents token-harvesting loops.
const csrfTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 100 : 30,
  message: {
    message: "Muitas requisições. Tente novamente em instantes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to get client IP
function getClientIp(req: Request): string | null {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    null
  );
}

// Helper to get user agent
function getUserAgent(req: Request): string | null {
  return req.headers["user-agent"] || null;
}

// Helper to get a trusted base URL for security-sensitive emails.
// Reads APP_URL (required in production) to prevent Host-header injection.
// Falls back to the request-derived origin only in non-production environments
// where APP_URL has not been configured (e.g. local development).
function getTrustedBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    // Startup already throws when APP_URL is absent in production,
    // so this branch should never be reached. Fail loudly if it is.
    throw new Error(
      "APP_URL must be set in production to build safe email links.",
    );
  }
  return `${req.protocol}://${req.get("host")}`;
}

// Helper to hash tokens with SHA256
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Stateless CSRF token helpers for routes that cannot rely on session storage
// (e.g. login, where the user is not yet authenticated).
// Format: "{unixTimestamp}|{hexNonce}|{hmacHex}"
// The HMAC is over "{timestamp}|{nonce}" using SESSION_SECRET, so the server
// can verify authenticity without storing anything.
function createStatelessCsrfToken(secret: string): string {
  const nonce = crypto.randomBytes(24).toString("hex");
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${ts}|${nonce}`;
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}|${mac}`;
}

function verifyStatelessCsrfToken(token: string, secret: string): boolean {
  try {
    const parts = token.split("|");
    if (parts.length !== 3) return false;
    const [ts, nonce, mac] = parts;
    if (mac.length !== 64) return false; // SHA-256 hex is always 64 chars

    const payload = `${ts}|${nonce}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))) {
      return false;
    }

    // Reject tokens older than 2 hours or from the future
    const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
    return Number.isInteger(age) && age >= 0 && age < 7200;
  } catch {
    return false;
  }
}

// Extend Express User type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: string;
      emailVerified?: boolean;
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
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Acesso negado. Apenas administradores." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Validate SESSION_SECRET in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production environment");
  }

  // Validate APP_URL in production — required to build safe email links
  // that cannot be poisoned via a forged Host header.
  if (process.env.NODE_ENV === "production") {
    if (!process.env.APP_URL) {
      throw new Error("APP_URL must be set in production environment");
    }
    let parsedAppUrl: URL;
    try {
      parsedAppUrl = new URL(process.env.APP_URL);
    } catch {
      throw new Error(
        `APP_URL is not a valid URL: "${process.env.APP_URL}"`,
      );
    }
    if (parsedAppUrl.protocol !== "https:") {
      throw new Error("APP_URL must use the https protocol in production");
    }
    if (parsedAppUrl.pathname !== "/" && parsedAppUrl.pathname !== "") {
      throw new Error(
        "APP_URL must be an origin without a path (e.g. https://example.com)",
      );
    }
  }

  // Validate ASAAS_SANDBOX in production — must be explicitly set to "false".
  // The default in server/asaas.ts is sandbox-on (treats anything other than
  // "false" as sandbox), which would expose the public POST
  // /api/payments/:paymentId/simulate-payment endpoint and allow attackers to
  // mark orders as paid without settlement. Fail closed at startup.
  if (process.env.NODE_ENV === "production") {
    if (process.env.ASAAS_SANDBOX !== "false") {
      throw new Error(
        'ASAAS_SANDBOX must be explicitly set to "false" in production to disable sandbox payment simulation.',
      );
    }
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
    }),
  );

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  // CSRF validation middleware for auth POST/PATCH/DELETE routes
  const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    const csrfToken = req.headers["x-csrf-token"];

    if (!session?.csrfToken) {
      return res.status(403).json({
        message: "Sessão inválida. Atualize a página e tente novamente.",
      });
    }

    if (!csrfToken || csrfToken !== session.csrfToken) {
      return res.status(403).json({
        message: "Token CSRF inválido. Atualize a página e tente novamente.",
      });
    }

    next();
  };

  // Precomputed bcrypt hash used for a constant-time dummy comparison when the
  // username does not exist. Prevents timing-based email enumeration: without
  // this, the absence of a bcrypt.compare() call when the user is missing would
  // make that branch visibly faster to a remote attacker.
  const DUMMY_BCRYPT_HASH =
    "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsIGbODi";

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try username field first; fall back to email field so users whose
        // account was created with a different username (e.g. via admin panel)
        // can still log in with their email address.
        const rawUser =
          (await storage.getUserByUsername(username)) ||
          (await storage.getUserByEmail(username));

        // Treat soft-deleted and anonymized accounts as non-existent.
        const user = rawUser && !rawUser.deletedAt && !rawUser.anonymizedAt
          ? rawUser
          : null;

        if (!user) {
          console.log(`[Auth] login attempt: no user found for "${username}"`);
          // Dummy compare keeps this branch as slow as the wrong-password branch
          // to prevent timing-based enumeration.
          await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
          return done(null, false, { message: "Credenciais inválidas" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.log(`[Auth] login attempt: wrong password for user id=${user.id} username="${user.username}"`);
          return done(null, false, { message: "Credenciais inválidas" });
        }

        console.log(`[Auth] login success: user id=${user.id} username="${user.username}"`);
        return done(null, {
          id: user.id,
          username: user.username,
          role: user.role,
          emailVerified: !!user.emailVerified,
        });
      } catch (err) {
        console.error(`[Auth] login error for "${username}":`, err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user || user.deletedAt || user.anonymizedAt) {
        return done(null, false);
      }
      done(null, { id: user.id, username: user.username, role: user.role, emailVerified: !!user.emailVerified });
    } catch (err) {
      done(err);
    }
  });

  // ============ AUTH ROUTES ============

  // CSRF Token endpoint
  // For authenticated sessions the existing session token is returned as-is.
  // For anonymous callers a fresh token is generated and returned in the
  // response body WITHOUT being written to the session, so no PostgreSQL
  // session row is created for unauthenticated requests. All routes that
  // actually enforce csrfProtection also require authentication, so the
  // session-stored token (set during login's session.regenerate) is always
  // present by the time any protected mutation is attempted.
  app.get("/api/auth/csrf-token", csrfTokenLimiter, (req: any, res: Response) => {
    if (req.session?.csrfToken) {
      // Authenticated session: return the session-stored token (set on login).
      return res.json({ csrfToken: req.session.csrfToken });
    }
    // Anonymous caller: return a stateless HMAC-signed token so the login
    // endpoint can verify it without creating a session row.
    res.json({ csrfToken: createStatelessCsrfToken(sessionSecret) });
  });

  // Customer registration endpoint (no CSRF - user not authenticated yet)
  app.post(
    "/api/auth/register",
    registerLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        // Validate input with Zod schema
        const validationResult = registerUserSchema.safeParse(req.body);
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map((e) => e.message);
          return res.status(400).json({
            message: "Erro de validação",
            errors: errors,
          });
        }

        const {
          username,
          email,
          password,
          consentTerms,
          consentPrivacy,
          consentMarketing,
        } = validationResult.data;

        const passwordValidation = validatePassword(password);
        if (!isPasswordValid(password)) {
          return res.status(400).json({
            message: "A senha não atende aos requisitos mínimos de segurança",
            feedback: passwordValidation.feedback,
            strength: passwordValidation.strength,
          });
        }

        const existingUser = await storage.getUserByUsername(email);
        if (existingUser) {
          // Do not reveal whether the email is already registered (email enumeration
          // prevention). Return the same generic success response so callers cannot
          // distinguish "new account created" from "email already taken".
          // Run the same bcrypt.hash that the new-user path runs so both branches
          // take the same wall-clock time — prevents timing-based enumeration.
          await bcrypt.hash(password, 12);
          return res.status(201).json({
            message:
              "Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await storage.createUser({
          username: email,
          password: hashedPassword,
          role: "customer",
          email,
          consentTerms,
          consentPrivacy,
          consentMarketing: consentMarketing || false,
        });

        // Log audit event
        await logAuditEvent(user.id, "register", clientIp, userAgent, {
          email,
        });

        // Auto-subscribe as lead (registered but no purchase yet)
        try {
          await storage.createOrUpdateSubscriber(
            email.toLowerCase(),
            username || email.split("@")[0],
            "lead",
          );
        } catch (subErr) {
          console.error("Failed to auto-subscribe customer:", subErr);
        }

        // Send admin notification for new lead
        sendAdminNotification("lead", {
          email,
          name: username || email.split("@")[0],
        }).catch((err) =>
          console.error("Failed to send lead notification:", err),
        );

        // Create email verification token and send verification email
        // Generate random token, store ONLY the hash, send raw token via email
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(verificationToken);
        const expiresAt = new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(); // 48 hours

        await storage.createEmailVerificationToken({
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: new Date().toISOString(),
        });

        const baseUrl = getTrustedBaseUrl(req);
        try {
          await sendVerificationEmail(email, verificationToken, baseUrl);
        } catch (emailErr: any) {
          console.error("Failed to send verification email:", emailErr);
          sendAdminNotification('email_failure', {
            email,
            reason: 'verification_email_failed',
            error: emailErr?.message || 'Unknown error',
          }).catch((notifErr) =>
            console.error("Failed to send admin notification for email failure:", notifErr),
          );
        }

        res.status(201).json({
          message:
            "Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Verify email
  app.get(
    "/api/auth/verify-email",
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
          return res
            .status(400)
            .json({ message: "Token de verificação inválido" });
        }

        // Hash the received token and compare to stored hash
        const tokenHash = hashToken(token);
        const tokenData =
          await storage.getEmailVerificationTokenByHash(tokenHash);

        if (!tokenData) {
          return res
            .status(400)
            .json({ message: "Token inválido ou já utilizado" });
        }

        if (new Date(tokenData.expiresAt) < new Date()) {
          return res.status(400).json({
            message: "Token expirado. Solicite um novo email de verificação.",
          });
        }

        // Mark user as verified
        await storage.updateUserEmailVerified(tokenData.userId, true);

        // Delete the used token
        await storage.deleteEmailVerificationTokensByUserId(tokenData.userId);

        // Log audit event
        await logAuditEvent(
          tokenData.userId,
          "email_verified",
          clientIp,
          userAgent,
        );

        res.json({
          message: "Email verificado com sucesso! Você já pode fazer login.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Resend verification email (no CSRF - user not authenticated yet)
  app.post(
    "/api/auth/resend-verification",
    resendVerificationLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const { email } = req.body;

        if (!email || typeof email !== "string" || !email.includes("@")) {
          return res
            .status(400)
            .json({ message: "Email válido é obrigatório" });
        }

        const user =
          (await storage.getUserByEmail(email)) ||
          (await storage.getUserByUsername(email));

        if (!user) {
          // Return success for security (don't reveal if email exists)
          return res.json({
            message:
              "Se o email existir em nossa base, você receberá um novo link de verificação.",
          });
        }

        if (user.emailVerified) {
          // Return the same generic message used when the user does not exist to
          // prevent email-enumeration via differentiated responses.
          return res.json({
            message:
              "Se o email existir em nossa base, você receberá um novo link de verificação.",
          });
        }

        // Delete old verification tokens
        await storage.deleteEmailVerificationTokensByUserId(user.id);

        // Create new verification token - store only hash, send raw token via email
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(verificationToken);
        const expiresAt = new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(); // 48 hours

        await storage.createEmailVerificationToken({
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: new Date().toISOString(),
        });

        // Send verification email
        const baseUrl = getTrustedBaseUrl(req);
        try {
          await sendVerificationEmail(
            user.email || email,
            verificationToken,
            baseUrl,
          );
        } catch (emailErr: any) {
          console.error("Failed to send verification email:", emailErr);
          sendAdminNotification('email_failure', {
            email: user.email || email,
            reason: 'verification_email_failed',
            error: emailErr?.message || 'Unknown error',
          }).catch((notifErr) =>
            console.error("Failed to send admin notification for email failure:", notifErr),
          );
        }

        // Log audit event
        await logAuditEvent(
          user.id,
          "verification_email_resent",
          clientIp,
          userAgent,
        );

        res.json({
          message:
            "Se o email existir em nossa base, você receberá um novo link de verificação.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Request password reset (no CSRF - user not authenticated yet)
  app.post(
    "/api/auth/forgot-password",
    forgotPasswordLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const { email } = req.body;

        if (!email || typeof email !== "string" || !email.includes("@")) {
          return res
            .status(400)
            .json({ message: "Email válido é obrigatório" });
        }

        const user = await storage.getUserByUsername(email);
        if (!user) {
          // Return success even if user doesn't exist (security best practice)
          return res.json({
            message:
              "Se o email existir em nossa base, você receberá um link de recuperação.",
          });
        }

        // Log audit event
        await logAuditEvent(
          user.id,
          "password_reset_request",
          clientIp,
          userAgent,
          { email },
        );

        // Invalidate (mark as used) all previous reset tokens for this user
        await storage.invalidatePasswordResetTokensByUserId(user.id);

        // Create new reset token - store only hash, send raw token via email
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(resetToken);
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours

        await storage.createPasswordResetToken({
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: new Date().toISOString(),
        });

        const baseUrl = getTrustedBaseUrl(req);
        try {
          await sendPasswordResetEmail(email, resetToken, baseUrl);
        } catch (emailErr) {
          console.error("Failed to send password reset email:", emailErr);
        }

        res.json({
          message:
            "Se o email existir em nossa base, você receberá um link de recuperação.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Validate reset token
  app.get("/api/auth/validate-reset-token", async (req, res, next) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res
          .status(400)
          .json({ valid: false, message: "Token inválido" });
      }

      // Hash the received token and compare to stored hash
      const tokenHash = hashToken(token);
      const tokenData = await storage.getPasswordResetTokenByHash(tokenHash);

      if (!tokenData) {
        return res
          .status(400)
          .json({ valid: false, message: "Token inválido ou já utilizado" });
      }

      if (new Date(tokenData.expiresAt) < new Date()) {
        return res
          .status(400)
          .json({ valid: false, message: "Token expirado" });
      }

      res.json({ valid: true });
    } catch (err) {
      next(err);
    }
  });

  // Reset password (no CSRF - user not authenticated yet)
  app.post(
    "/api/auth/reset-password",
    resetPasswordLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const { token, password } = req.body;

        if (!token || !password) {
          return res
            .status(400)
            .json({ message: "Token e nova senha são obrigatórios" });
        }

        const passwordValidation = validatePassword(password);
        if (!isPasswordValid(password)) {
          return res.status(400).json({
            message: "A senha não atende aos requisitos mínimos de segurança",
            feedback: passwordValidation.feedback,
            strength: passwordValidation.strength,
          });
        }

        // Hash the received token and compare to stored hash
        const tokenHash = hashToken(token);
        const tokenData = await storage.getPasswordResetTokenByHash(tokenHash);

        if (!tokenData) {
          return res
            .status(400)
            .json({ message: "Token inválido ou já utilizado" });
        }

        if (new Date(tokenData.expiresAt) < new Date()) {
          return res.status(400).json({
            message:
              "Token expirado. Por favor, solicite um novo link de recuperação.",
          });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 12);
        await storage.updateUserPassword(tokenData.userId, hashedPassword);

        // Invalidate all active sessions for this user (security: force re-login on all devices)
        await pool.query(
          `DELETE FROM session WHERE sess::jsonb -> 'passport' -> 'user' = to_jsonb($1::int)`,
          [tokenData.userId]
        );

        // Invalidate all password reset tokens for this user (marks them as used)
        await storage.invalidatePasswordResetTokensByUserId(tokenData.userId);

        // Log audit event
        await logAuditEvent(
          tokenData.userId,
          "password_reset_complete",
          clientIp,
          userAgent,
        );

        res.json({
          message: "Senha alterada com sucesso! Você já pode fazer login.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Login - CSRF protected via stateless HMAC-signed token
  app.post(
    "/api/auth/login",
    loginLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      // Reject requests that do not carry a valid CSRF token.
      // Two valid paths:
      //   1. Anonymous: HMAC-signed stateless token from GET /api/auth/csrf-token
      //   2. Already-authenticated (edge case): session-stored token
      const incomingCsrf = req.headers["x-csrf-token"] as string | undefined;
      const sessionCsrf = (req as any).session?.csrfToken as string | undefined;
      const csrfValid =
        incomingCsrf &&
        (verifyStatelessCsrfToken(incomingCsrf, sessionSecret) ||
          (sessionCsrf && incomingCsrf === sessionCsrf));
      if (!csrfValid) {
        return res.status(403).json({
          message: "Token CSRF inválido. Atualize a página e tente novamente.",
        });
      }

      // Validate input with Zod schema
      const validationResult = loginUserSchema.safeParse({
        usernameOrEmail: req.body.username || req.body.usernameOrEmail,
        password: req.body.password,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((e) => e.message);
        return res.status(400).json({
          message: "Erro de validação",
          errors: errors,
        });
      }

      passport.authenticate(
        "local",
        async (err: any, user: Express.User, info: any) => {
          if (err) {
            return next(err);
          }
          if (!user) {
            // Log failed login attempt
            const attemptedUser = await storage.getUserByUsername(
              req.body.username,
            );
            await logAuditEvent(
              attemptedUser?.id || null,
              "login_failed",
              clientIp,
              userAgent,
              { username: req.body.username, reason: info?.message },
            );
            return res
              .status(401)
              .json({ message: info?.message || "Credenciais inválidas" });
          }

          req.session.regenerate((regenErr) => {
            if (regenErr) {
              return next(regenErr);
            }

            req.logIn(user, async (err) => {
              if (err) {
                return next(err);
              }

              // Passport 0.7's req.logIn() regenerates the session internally
              // (session-fixation hardening), which discards any property set on
              // the pre-login session. The CSRF token MUST therefore be assigned
              // AFTER req.logIn() completes — otherwise req.session.csrfToken is
              // lost and every later CSRF-protected request (notably logout)
              // fails with 403. Persist it explicitly so the regenerated session
              // row carries the token before the response is sent.
              (req.session as any).csrfToken = crypto.randomBytes(32).toString("hex");

              // Log successful login
              await logAuditEvent(user.id, "login", clientIp, userAgent);

              req.session.save((saveErr) => {
                if (saveErr) {
                  return next(saveErr);
                }

                return res.json({
                  id: user.id,
                  username: user.username,
                  role: user.role,
                  emailVerified: user.emailVerified ?? false,
                });
              });
            });
          });
        },
      )(req, res, next);
    },
  );

  // Logout
  app.post(
    "/api/auth/logout",
    csrfProtection,
    (req: Request, res: Response) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);
      const userId = (req as any).user?.id;

      req.logout(async (logoutErr) => {
        // Log logout event before destroying session
        if (userId) {
          await logAuditEvent(userId, "logout", clientIp, userAgent);
        }

        // Destroy the session entirely so stale allowedPaymentIds (and any
        // other session-scoped authorization data) cannot be inherited by the
        // next browser user or a subsequent login on the same device.
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            // Non-fatal: log but still return success so the client clears its state
            console.error("[Auth] Failed to destroy session on logout:", destroyErr);
          }
          res.clearCookie("connect.sid");
          res.json({ message: "Logout realizado com sucesso" });
        });
      });
    },
  );

  // Cart (server-side sync for authenticated users)
  app.get(
    "/api/cart",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user?.id as number;
        const items = await storage.getCartByUserId(userId);
        res.json(items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          stoneType: item.stoneType ?? undefined,
        })));
      } catch (err) {
        next(err);
      }
    },
  );

  app.put(
    "/api/cart",
    csrfProtection,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user?.id as number;
        const itemsSchema = z.array(z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().positive(),
          stoneType: z.string().optional(),
        }));
        const parsed = itemsSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Dados do carrinho inválidos" });
        }
        const saved = await storage.replaceCart(userId, parsed.data);
        res.json(saved.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          stoneType: item.stoneType ?? undefined,
        })));
      } catch (err) {
        next(err);
      }
    },
  );

  app.delete(
    "/api/cart",
    csrfProtection,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user?.id as number;
        await storage.clearCartByUserId(userId);
        res.json({ message: "Carrinho limpo" });
      } catch (err) {
        next(err);
      }
    },
  );

  // Change password (logged in user)
  app.post(
    "/api/auth/change-password",
    changePasswordLimiter,
    csrfProtection,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ message: "Senha atual e nova senha são obrigatórias" });
        }

        const userId = (req as any).user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Não autenticado" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "Usuário não encontrado" });
        }

        const isCurrentValid = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!isCurrentValid) {
          await logAuditEvent(
            userId,
            "change_password_failed",
            clientIp,
            userAgent,
            { reason: "wrong_current_password" },
          );
          return res.status(400).json({ message: "Senha atual incorreta" });
        }

        if (currentPassword === newPassword) {
          return res.status(400).json({
            message: "A nova senha deve ser diferente da senha atual",
          });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!isPasswordValid(newPassword)) {
          return res.status(400).json({
            message:
              "A nova senha não atende aos requisitos mínimos de segurança",
            feedback: passwordValidation.feedback,
          });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await storage.updateUserPassword(userId, hashedPassword);

        // Revoke ALL active sessions for this user — including the current one.
        // This ensures that any stolen session cookie (even the one used to
        // submit this request) becomes invalid immediately after the password
        // change. The legitimate user is kept logged in via the fresh session
        // created below.
        await pool.query(
          `DELETE FROM session WHERE sess::jsonb -> 'passport' -> 'user' = to_jsonb($1::int)`,
          [userId],
        );

        // Regenerate the session so the browser receives a new cookie that is
        // not present in the session table that was just wiped. Then re-log the
        // user in on the new session so they stay authenticated.
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        // req.user is guaranteed by requireAuth middleware; use non-null assertion.
        await new Promise<void>((resolve, reject) => {
          req.logIn(req.user!, (err: Error | null) => {
            if (err) return reject(err);
            resolve();
          });
        });

        await logAuditEvent(userId, "change_password", clientIp, userAgent);

        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // Check auth status
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user!.id,
        username: req.user!.username,
        role: req.user!.role,
        emailVerified: req.user!.emailVerified ?? false,
      });
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  // ============ USER PROFILE ROUTES ============

  app.get(
    "/api/users/profile",
    requireAuth,
    async (req: any, res: Response, next: NextFunction) => {
      try {
        const profile = await storage.getUserProfile(req.user.id);
        if (!profile) {
          return res.status(404).json({ message: "Perfil não encontrado" });
        }
        res.set("Cache-Control", "private, no-cache");
        res.json(profile);
      } catch (err) {
        next(err);
      }
    },
  );

  app.patch(
    "/api/users/profile",
    requireAuth,
    csrfProtection,
    async (req: any, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const validationResult = updateUserProfileSchema.safeParse(req.body);
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map((e) => e.message);
          return res.status(400).json({ message: "Erro de validação", errors });
        }

        const updatedProfile = await storage.updateUserProfile(
          req.user.id,
          validationResult.data,
        );

        if (!updatedProfile) {
          return res.status(404).json({ message: "Perfil não encontrado" });
        }

        const changedFields = Object.keys(validationResult.data);
        await logAuditEvent(req.user.id, "profile_update", clientIp, userAgent, {
          changedFields,
        });

        res.json(updatedProfile);
      } catch (err) {
        next(err);
      }
    },
  );

  // ============ ADMIN MANAGEMENT ROUTES ============
  const PRIMARY_ADMIN_EMAIL =
    process.env.PRIMARY_ADMIN_EMAIL ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("PRIMARY_ADMIN_EMAIL must be set in production");
        })()
      : "admin@localhost");

  // Get all admins (only primary admin can access)
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({
          message:
            "Apenas o administrador principal pode gerenciar outros administradores.",
        });
      }
      const admins = await storage.getAdminUsers();
      res.json(
        admins.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Add new admin (only primary admin can do this)
  app.post("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({
          message:
            "Apenas o administrador principal pode adicionar administradores.",
        });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Email e senha são obrigatórios" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "admin",
      });

      res
        .status(201)
        .json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      next(err);
    }
  });

  // Delete admin (only primary admin, cannot delete self)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
      if (req.user?.username !== PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({
          message:
            "Apenas o administrador principal pode remover administradores.",
        });
      }

      const id = parseInt(req.params.id);
      const userToDelete = await storage.getUser(id);

      if (!userToDelete) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (userToDelete.username === PRIMARY_ADMIN_EMAIL) {
        return res.status(403).json({
          message: "Não é possível remover o administrador principal",
        });
      }

      await storage.deleteUser(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ CATEGORIES ROUTES ============

  app.get("/api/categories", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/categories/:slug", publicCatalogLimiter, async (req, res, next) => {
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

  app.post("/api/categories", requireAdmin, async (req, res, next) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/categories/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/categories/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);

      // Check if category has products before deleting
      const categoryProducts = await storage.getProductsByCategory(id);
      if (categoryProducts && categoryProducts.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta categoria. Existem ${categoryProducts.length} produto(s) associado(s). Remova ou mova os produtos primeiro.`,
        });
      }

      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ COLLECTIONS ROUTES ============

  app.get("/api/collections", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/collections/:slug", publicCatalogLimiter, async (req, res, next) => {
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

  app.post("/api/collections", requireAdmin, async (req, res, next) => {
    try {
      const data = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(data);
      res.status(201).json(collection);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/collections/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/collections/:id", requireAdmin, async (req, res, next) => {
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
    const v = cacheBuster || "";
    return products.map((p) => ({
      ...p,
      image: p.image?.startsWith("data:")
        ? `/api/products/${p.id}/image${v}`
        : p.image,
      imageColor: p.imageColor?.startsWith("data:")
        ? `/api/products/${p.id}/image-color${v}`
        : p.imageColor,
      version1: p.version1?.startsWith("data:")
        ? `/api/products/${p.id}/version1${v}`
        : p.version1,
      version2: p.version2?.startsWith("data:")
        ? `/api/products/${p.id}/version2${v}`
        : p.version2,
      version3: p.version3?.startsWith("data:")
        ? `/api/products/${p.id}/version3${v}`
        : p.version3,
    }));
  };

  // Helper for single product
  const stripBase64ImagesFromProduct = (p: any, cacheBuster?: string) => {
    const v = cacheBuster || "";
    return {
      ...p,
      image: p.image?.startsWith("data:")
        ? `/api/products/${p.id}/image${v}`
        : p.image,
      imageColor: p.imageColor?.startsWith("data:")
        ? `/api/products/${p.id}/image-color${v}`
        : p.imageColor,
      version1: p.version1?.startsWith("data:")
        ? `/api/products/${p.id}/version1${v}`
        : p.version1,
      version2: p.version2?.startsWith("data:")
        ? `/api/products/${p.id}/version2${v}`
        : p.version2,
      version3: p.version3?.startsWith("data:")
        ? `/api/products/${p.id}/version3${v}`
        : p.version3,
    };
  };

  app.get("/api/products", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=30, stale-while-revalidate=120",
      );
      const { category, collection, bestsellers, new: isNew, full } = req.query;

      let products: any[] = [];
      
      if (full === "true") {
        if (bestsellers === "true") {
          products = await storage.getBestsellers();
        } else if (isNew === "true") {
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
      } else {
        const allProducts = await storage.getProductsLightweight();
        if (bestsellers === "true") {
          products = allProducts.filter((p: any) => p.bestsellerOrder != null).sort((a: any, b: any) => (a.bestsellerOrder || 0) - (b.bestsellerOrder || 0));
        } else if (isNew === "true") {
          products = allProducts.filter((p: any) => p.isNew);
        } else if (category) {
          const cat = await storage.getCategoryBySlug(category as string);
          products = cat ? allProducts.filter((p: any) => p.categoryId === cat.id) : [];
        } else if (collection) {
          const col = await storage.getCollectionBySlug(collection as string);
          products = col ? allProducts.filter((p: any) => p.collectionId === col.id) : [];
        } else {
          products = allProducts;
        }
        res.json(products);
      }
    } catch (err) {
      next(err);
    }
  });

  // Serve product images separately
  app.get("/api/products/:id/image", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=604800, stale-while-revalidate=2592000, immutable",
      );
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product || !product.image) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }

      // Detect circular reference (image pointing to itself)
      if (product.image.includes(`/api/products/${id}/image`)) {
        return res.status(404).json({
          message:
            "Imagem não configurada corretamente - favor reupar a imagem",
        });
      }

      // If it's base64, decode and send as image
      if (product.image.startsWith("data:")) {
        const matches = product.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.set("Content-Type", mimeType);
          return res.send(buffer);
        }
      }

      // If it's a URL, redirect to it
      res.redirect(product.image);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/products/:id/image-color", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=604800, stale-while-revalidate=2592000, immutable",
      );
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product || !product.imageColor) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }

      // Detect circular reference
      if (product.imageColor.includes(`/api/products/${id}/image`)) {
        return res.status(404).json({
          message:
            "Imagem não configurada corretamente - favor reupar a imagem",
        });
      }

      // If it's base64, decode and send as image
      if (product.imageColor.startsWith("data:")) {
        const matches = product.imageColor.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.set("Content-Type", mimeType);
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
  app.get(
    "/api/products/:id/:field(version1|version2|version3)",
    publicCatalogLimiter,
    async (req, res, next) => {
      try {
        res.set(
          "Cache-Control",
          "public, max-age=604800, stale-while-revalidate=2592000, immutable",
        );
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID de produto inválido" });
        }
        const field = req.params.field as "version1" | "version2" | "version3";
        const product = await storage.getProductById(id);
        if (!product || !product[field]) {
          return res.status(404).json({ message: "Imagem não encontrada" });
        }

        const imageData = product[field];

        // Detect circular reference
        if (imageData.includes(`/api/products/${id}/${field}`)) {
          return res.status(404).json({
            message:
              "Imagem não configurada corretamente - favor reupar a imagem",
          });
        }

        if (imageData.startsWith("data:")) {
          const matches = imageData.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, "base64");
            res.set("Content-Type", mimeType);
            return res.send(buffer);
          }
        }

        res.redirect(imageData);
      } catch (err) {
        next(err);
      }
    },
  );

  // DEPOIS — strip base64, retorna URLs de imagem
  app.get("/api/products/:id", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=30, stale-while-revalidate=120",
      );
      const id = parseInt(req.params.id);
      const { full } = req.query;
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      // Strip base64 unless admin requests full=true
      if (full !== "true") {
        return res.json(stripBase64ImagesFromProduct(product));
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/products", requireAdmin, adminLargeJsonParser, adminLargeUrlencodedParser, async (req, res, next) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      const cacheBuster = `?v=${Date.now()}`;
      res.status(201).json(stripBase64ImagesFromProduct(product, cacheBuster));
    } catch (err) {
      next(err);
    }
  });

  // Reorder products (drag-and-drop)
  app.put("/api/products/reorder", requireAdmin, async (req, res, next) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      await storage.reorderProducts(orderedIds);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Clone product to Noivas category
  app.post(
    "/api/products/:id/clone-noivas",
    requireAdmin,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const original = await storage.getProductById(id);
        if (!original) {
          return res.status(404).json({ message: "Produto não encontrado" });
        }

        // Find Noivas category
        const noivasCategory = await storage.getCategoryBySlug("noivas");
        if (!noivasCategory) {
          return res
            .status(400)
            .json({ message: "Categoria Noivas não encontrada" });
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
        res
          .status(201)
          .json(stripBase64ImagesFromProduct(clonedProduct, cacheBuster));
      } catch (err) {
        next(err);
      }
    },
  );

  app.patch("/api/products/:id", requireAdmin, adminLargeJsonParser, adminLargeUrlencodedParser, async (req, res, next) => {
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

  app.delete("/api/products/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ JOURNAL POSTS ROUTES ============

  app.get("/api/journal", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      const posts = await storage.getJournalPosts();
      res.json(posts);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/journal/:id", publicCatalogLimiter, async (req, res, next) => {
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

  app.post("/api/journal", requireAdmin, async (req, res, next) => {
    try {
      const data = insertJournalPostSchema.parse(req.body);
      const post = await storage.createJournalPost(data);
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/journal/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/journal/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteJournalPost(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ SUBSCRIBERS ROUTES ============

  // CSV injection prevention: neutralise formula-triggering prefixes (=, +, -, @, \t, \r)
  // by prepending a single-quote so spreadsheet apps treat the value as plain text.
  // Double-quotes inside the value are escaped per RFC 4180 (doubled).
  function sanitizeCsvField(value: string | number | null | undefined): string {
    if (value == null) return '';
    const str = String(value);
    return /^[=+\-@\t\r]/.test(str) ? `'${str.replace(/"/g, '""')}` : str.replace(/"/g, '""');
  }

  function csvRow(fields: (string | number | null | undefined)[]): string {
    return fields.map(f => `"${sanitizeCsvField(f)}"`).join(',');
  }

  // Export subscribers as sanitized CSV (admin only)
  app.get("/api/subscribers/export", requireAdmin, async (req, res, next) => {
    try {
      const { type } = req.query;
      const list = (type && typeof type === 'string')
        ? await storage.getSubscribersByType(type)
        : await storage.getSubscribers();

      const header = 'ID,Nome,Email,Tipo,Data,Status';
      const rows = list.map(s => csvRow([s.id, s.name || '', s.email, s.type || 'newsletter', s.date, s.status]));
      const csv = [header, ...rows].join('\r\n');

      // Sanitize filename: only allow alphanumeric, hyphens, and underscores to
      // prevent HTTP header injection via a crafted ?type= query parameter.
      const safeType = (type && typeof type === 'string')
        ? type.replace(/[^a-z0-9_-]/gi, '_')
        : '';
      const filename = safeType ? `${safeType}.csv` : 'todos_assinantes.csv';

      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/subscribers", requireAdmin, async (req, res, next) => {
    try {
      const { type } = req.query;
      let subscribersList;
      if (type && typeof type === "string") {
        subscribersList = await storage.getSubscribersByType(type);
      } else {
        subscribersList = await storage.getSubscribers();
      }
      res.json(subscribersList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/subscribers", subscriberLimiter, async (req, res, next) => {
    try {
      // Add date and name defaults before validation
      const bodyWithDefaults = {
        ...req.body,
        date: req.body.date || new Date().toISOString().split("T")[0],
        name: req.body.name || "",
      };
      const data = insertSubscriberSchema.parse(bodyWithDefaults);

      // Check if email already exists — return generic success to prevent subscriber enumeration
      const existing = await storage.getSubscriberByEmail(data.email);
      if (existing) {
        return res.status(200).json({ message: "Inscrição confirmada!" });
      }

      // Default type is 'newsletter' for signups from the site footer
      await storage.createSubscriber({
        ...data,
        type: data.type || "newsletter",
      });

      // Admin notification intentionally omitted: sending an outbound email on
      // every anonymous public signup would let an attacker exhaust the email
      // quota and flood the admin inbox by cycling unique addresses.  Admins
      // can review new subscribers through the admin dashboard instead.

      // Return the same response as the "already subscribed" path above so
      // callers cannot distinguish new vs existing subscribers (enumeration).
      res.status(200).json({ message: "Inscrição confirmada!" });
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/subscribers/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/subscribers/:id", requireAdmin, async (req, res, next) => {
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
        return res
          .status(400)
          .json({ message: "Lista de assinantes vazia ou inválida" });
      }

      const today = new Date().toISOString().split("T")[0];
      const validSubscribers = subscribersList
        .filter(
          (sub: any) =>
            sub.email &&
            typeof sub.email === "string" &&
            sub.email.includes("@"),
        )
        .map((sub: any) => ({
          name: (sub.name || sub.email.split("@")[0]).trim(),
          email: sub.email.toLowerCase().trim(),
          date: sub.date || today,
          status: "active",
        }));

      if (validSubscribers.length === 0) {
        return res
          .status(400)
          .json({ message: "Nenhum email válido encontrado na lista" });
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

  app.get("/api/customers", requireAdmin, async (req, res, next) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (err) {
      next(err);
    }
  });

  // Export customers as sanitized CSV (admin only)
  app.get("/api/customers/export", requireAdmin, async (req, res, next) => {
    try {
      const list = await storage.getCustomers();
      const header = 'ID,Nome,Email,Pedidos,Total Gasto,Ultima Compra';
      const rows = list.map(c => csvRow([c.id, c.name, c.email, c.orders ?? 0, c.totalSpent ?? 0, c.lastOrder ?? '']));
      const csv = [header, ...rows].join('\r\n');

      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="clientes.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/customers", requireAdmin, async (req, res, next) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);

      // Send admin notification for new customer
      sendAdminNotification("customer", {
        email: data.email,
        name: data.name,
      }).catch((err) =>
        console.error("Failed to send customer notification:", err),
      );

      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/customers/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/customers/:id", requireAdmin, async (req, res, next) => {
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
      const user = (req as any).user;
      let orderList;
      if (user?.role === "admin") {
        orderList = await storage.getOrders();
      } else {
        orderList = await storage.getOrdersByUserId(user.id);
      }
      res.json(orderList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/orders", requireAdmin, async (req, res, next) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(data);

      // Upgrade or create subscriber as customer when order is created
      let customerEmail = "";
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
              "customer",
            );
          }
        } catch (subErr) {
          console.error("Failed to upgrade subscriber to customer:", subErr);
        }
      }

      // Send admin notification for new order/sale
      sendAdminNotification("order", {
        orderId: data.orderId,
        name: customerName,
        email: customerEmail,
        total: data.total,
        items: data.items,
      }).catch((err) =>
        console.error("Failed to send order notification:", err),
      );

      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/orders/:id", requireAdmin, async (req, res, next) => {
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

  app.delete("/api/orders/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOrder(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ============ CONFIG ROUTES ============

  app.get("/api/config/whatsapp", publicCatalogLimiter, (req, res) => {
    res.set("Cache-Control", "public, max-age=3600");
    res.json({
      number: process.env.WHATSAPP_NUMBER || "5511999999999",
      message:
        process.env.WHATSAPP_MESSAGE ||
        "Olá! Gostaria de saber mais sobre as joias ZK REZK.",
    });
  });

  // ============ BRANDING ROUTES ============

  app.get("/api/branding", publicCatalogLimiter, async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        "public, max-age=120, stale-while-revalidate=600",
      );
      const branding = await storage.getBranding();
      if (!branding) {
        return res.status(404).json({ message: "Branding não configurado" });
      }
      res.json(branding);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/branding", requireAdmin, async (req, res, next) => {
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
    message: {
      message:
        "Você já solicitou uma exportação de dados hoje. Tente novamente amanhã.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // GET /api/lgpd/consent-history - Returns user's consent data and audit history
  app.get(
    "/api/lgpd/consent-history",
    requireAuth,
    async (req: any, res: Response, next: NextFunction) => {
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
          auditHistory: auditLogs.map((log) => ({
            action: log.action,
            details: log.details ? JSON.parse(log.details) : null,
            createdAt: log.createdAt,
          })),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // PATCH /api/lgpd/consent - Updates consent preferences
  app.patch(
    "/api/lgpd/consent",
    requireAuth,
    csrfProtection,
    async (req: any, res: Response, next: NextFunction) => {
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

        const newValues: {
          consentMarketing?: boolean;
          consentTerms?: boolean;
          consentPrivacy?: boolean;
        } = {};
        if (typeof consentMarketing === "boolean")
          newValues.consentMarketing = consentMarketing;
        if (typeof consentTerms === "boolean")
          newValues.consentTerms = consentTerms;
        if (typeof consentPrivacy === "boolean")
          newValues.consentPrivacy = consentPrivacy;

        if (Object.keys(newValues).length === 0) {
          return res.status(400).json({
            message: "Nenhuma preferência de consentimento fornecida",
          });
        }

        const updatedUser = await storage.updateUserConsent(userId, newValues);

        // Log audit event
        await logAuditEvent(userId, "consent_update", clientIp, userAgent, {
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
    },
  );

  // POST /api/lgpd/data-export - Creates a data export request
  app.post(
    "/api/lgpd/data-export",
    requireAuth,
    csrfProtection,
    async (req: any, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const userId = req.user.id;

        // Check for recent request (rate limiting at storage level)
        const recentRequest = await storage.getRecentDataExportRequest(
          userId,
          24,
        );
        if (recentRequest) {
          return res.status(429).json({
            message:
              "Você já solicitou uma exportação de dados nas últimas 24 horas. Tente novamente mais tarde.",
            existingRequestId: recentRequest.id,
            status: recentRequest.status,
          });
        }

        const request = await storage.createDataExportRequest(userId);

        // Log audit event
        await logAuditEvent(
          userId,
          "data_export_request",
          clientIp,
          userAgent,
          {
            requestId: request.id,
          },
        );

        res.status(201).json({
          message:
            "Solicitação de exportação de dados criada com sucesso. Você pode gerar o arquivo agora.",
          requestId: request.id,
          status: request.status,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/lgpd/data-export/:requestId - Returns status of data export request
  app.get(
    "/api/lgpd/data-export/:requestId",
    requireAuth,
    async (req: any, res: Response, next: NextFunction) => {
      try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        if (isNaN(requestId)) {
          return res
            .status(400)
            .json({ message: "ID de solicitação inválido" });
        }

        const request = await storage.getDataExportRequest(requestId, userId);

        if (!request) {
          return res
            .status(404)
            .json({ message: "Solicitação de exportação não encontrada" });
        }

        const response: any = {
          id: request.id,
          status: request.status,
          requestedAt: request.requestedAt,
          completedAt: request.completedAt,
        };

        // Include download URL only if completed and not expired
        if (
          request.status === "completed" &&
          request.downloadUrl &&
          request.expiresAt
        ) {
          if (new Date(request.expiresAt) > new Date()) {
            response.downloadUrl = request.downloadUrl;
            response.expiresAt = request.expiresAt;
          } else {
            response.message =
              "O link de download expirou. Solicite uma nova exportação.";
          }
        }

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/lgpd/data-export/:requestId/generate - Generates the data export file
  app.post(
    "/api/lgpd/data-export/:requestId/generate",
    requireAuth,
    csrfProtection,
    async (req: any, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        if (isNaN(requestId)) {
          return res
            .status(400)
            .json({ message: "ID de solicitação inválido" });
        }

        const request = await storage.getDataExportRequest(requestId, userId);

        if (!request) {
          return res
            .status(404)
            .json({ message: "Solicitação de exportação não encontrada" });
        }

        if (request.status === "completed") {
          return res
            .status(400)
            .json({ message: "Esta exportação já foi gerada" });
        }

        // Update status to processing
        await storage.updateDataExportRequest(requestId, {
          status: "processing",
        });

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
          auditLog: allData.auditLogs.map((log) => ({
            action: log.action,
            createdAt: log.createdAt,
            ipAddress: log.ipAddress,
          })),
          previousExportRequests: allData.dataExportRequests
            .filter((r) => r.id !== requestId)
            .map((r) => ({
              id: r.id,
              status: r.status,
              requestedAt: r.requestedAt,
            })),
        };

        // Create base64 encoded JSON as download URL
        const jsonContent = JSON.stringify(exportData, null, 2);
        const base64Content = Buffer.from(jsonContent).toString("base64");
        const downloadUrl = `data:application/json;base64,${base64Content}`;

        // Set expiration to 24 hours from now
        const expiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();

        // Update request with completed status
        const updatedRequest = await storage.updateDataExportRequest(
          requestId,
          {
            status: "completed",
            completedAt: new Date().toISOString(),
            downloadUrl,
            expiresAt,
          },
        );

        // Log audit event
        await logAuditEvent(
          userId,
          "data_export_generated",
          clientIp,
          userAgent,
          {
            requestId,
          },
        );

        res.json({
          message: "Exportação de dados gerada com sucesso",
          id: requestId,
          status: "completed",
          downloadUrl,
          expiresAt,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // DELETE /api/lgpd/account - Deletes or anonymizes account
  app.delete(
    "/api/lgpd/account",
    requireAuth,
    csrfProtection,
    async (req: any, res: Response, next: NextFunction) => {
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      try {
        const userId = req.user.id;
        const { password, mode } = req.body;

        if (!password) {
          return res
            .status(400)
            .json({ message: "Senha é obrigatória para confirmar esta ação" });
        }

        if (!mode || !["anonymize", "delete"].includes(mode)) {
          return res
            .status(400)
            .json({ message: "Modo inválido. Use 'anonymize' ou 'delete'" });
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

        if (mode === "anonymize") {
          result = await storage.anonymizeUser(userId);
          auditAction = "account_anonymize";
          responseMessage =
            "Sua conta foi anonimizada. Todos os seus dados pessoais foram removidos.";
        } else {
          result = await storage.softDeleteUser(userId);
          auditAction = "account_delete";
          responseMessage =
            "Sua conta foi marcada para exclusão. Os dados serão removidos permanentemente em 30 dias.";
        }

        // Log audit event before invalidating session
        await logAuditEvent(userId, auditAction, clientIp, userAgent, {
          mode,
          email: user.email,
        });

        // Revoke ALL active sessions for this user across all devices so that
        // stolen session cookies or sessions on other devices are evicted immediately.
        await pool.query(
          `DELETE FROM session WHERE sess::jsonb -> 'passport' -> 'user' = to_jsonb($1::int)`,
          [userId],
        );

        res.json({
          message: responseMessage,
          mode,
          processedAt: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/lgpd/data - Returns all personal data for transparency
  app.get(
    "/api/lgpd/data",
    requireAuth,
    async (req: any, res: Response, next: NextFunction) => {
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
          orders: allData.orders.map((order) => ({
            id: order.id,
            orderId: order.orderId,
            date: order.date,
            status: order.status,
            total: order.total,
            items: order.items,
          })),
          subscription: allData.subscriber
            ? {
                email: allData.subscriber.email,
                type: allData.subscriber.type,
                status: allData.subscriber.status,
                date: allData.subscriber.date,
              }
            : null,
          auditLogSummary: {
            totalEvents: allData.auditLogs.length,
            recentEvents: allData.auditLogs.slice(0, 10).map((log) => ({
              action: log.action,
              createdAt: log.createdAt,
            })),
          },
          dataExportRequests: allData.dataExportRequests.map((req) => ({
            id: req.id,
            status: req.status,
            requestedAt: req.requestedAt,
            completedAt: req.completedAt,
          })),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ============ SEO ROUTES ============

  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("text/plain");
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

  app.get("/sitemap.xml", sitemapLimiter, async (req, res, next) => {
    try {
      // Serve from cache if still valid — avoids full-table reads on every hit
      const now = Date.now();
      if (sitemapCache && sitemapCache.expiresAt > now) {
        res.type("application/xml");
        res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
        return res.send(sitemapCache.xml);
      }

      const baseUrl = getTrustedBaseUrl(req);
      const [productIds, journalPostIds] = await Promise.all([
        storage.getProductIds(),
        storage.getJournalPostIds(),
      ]);

      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/shop", priority: "0.9", changefreq: "daily" },
        { url: "/collections", priority: "0.8", changefreq: "weekly" },
        { url: "/lookbook", priority: "0.7", changefreq: "weekly" },
        { url: "/journal", priority: "0.7", changefreq: "weekly" },
        { url: "/noivas", priority: "0.7", changefreq: "weekly" },
        { url: "/atelier", priority: "0.7", changefreq: "monthly" },
        { url: "/manifesto", priority: "0.6", changefreq: "monthly" },
        { url: "/about", priority: "0.6", changefreq: "monthly" },
        { url: "/contact", priority: "0.5", changefreq: "monthly" },
        { url: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
        { url: "/terms-of-use", priority: "0.3", changefreq: "yearly" },
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

      for (const id of productIds) {
        xml += `  <url>
    <loc>${baseUrl}/product/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      for (const id of journalPostIds) {
        xml += `  <url>
    <loc>${baseUrl}/journal/${id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }

      xml += `</urlset>`;

      // Store in cache for next requests
      sitemapCache = { xml, expiresAt: Date.now() + SITEMAP_TTL_MS };

      res.type("application/xml");
      res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });

  // ============ ASAAS WEBHOOK ============
  // Webhook URL for ASAAS configuration: https://www.zkrezk.com/api/webhooks/asaas
  // Events to configure: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
  // Token: set ASAAS_WEBHOOK_TOKEN in Replit Secrets with a secure random string (e.g. uuid v4),
  //        then configure the same value in the ASAAS webhook panel under "asaas-access-token" header.

  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    try {
      const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
      const headerToken = req.headers["asaas-access-token"] as string | undefined;
      const isProduction = process.env.NODE_ENV === "production";

      if (webhookToken) {
        // Constant-time comparison prevents timing-based brute-force of the
        // webhook secret. timingSafeEqual throws if buffer lengths differ, so
        // the length check must happen first (a length mismatch is itself a
        // rejection, handled by tokenValid remaining false).
        let tokenValid = false;
        if (headerToken) {
          const expected = Buffer.from(webhookToken);
          const received = Buffer.from(headerToken);
          tokenValid =
            expected.length === received.length &&
            crypto.timingSafeEqual(expected, received);
        }
        if (!tokenValid) {
          console.error("[Webhook ASAAS] Invalid or missing token — rejecting");
          // Return generic 200 without hinting at the reason for rejection.
          return res.status(200).json({ received: true });
        }
      } else if (isProduction) {
        console.error("[Webhook ASAAS] ASAAS_WEBHOOK_TOKEN not configured in production — rejecting for security");
        return res.status(200).json({ received: true });
      } else {
        console.warn("[Webhook ASAAS] ASAAS_WEBHOOK_TOKEN not configured — processing without auth (dev mode)");
      }

      const { id: webhookEventId, event, payment } = req.body || {};
      console.log(`[Webhook ASAAS] Event received: ${event}, eventId: ${webhookEventId ?? "none"}, paymentId: ${payment?.id}, status: ${payment?.status}`);

      const processableEvents = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
      if (!processableEvents.includes(event)) {
        return res.status(200).json({ received: true });
      }

      const asaasPaymentId = payment?.id;
      if (!asaasPaymentId) {
        console.warn("[Webhook ASAAS] No payment ID in webhook body");
        return res.status(200).json({ received: true });
      }

      const localPayment = await storage.getAsaasPaymentByAsaasId(asaasPaymentId);
      if (!localPayment) {
        console.log(`[Webhook ASAAS] Payment ${asaasPaymentId} not found locally — ignoring`);
        return res.status(200).json({ received: true });
      }

      // Fast path: if the local record already shows a terminal status, skip
      // without hitting the DB again (handles replays cheaply).
      if (["CONFIRMED", "RECEIVED"].includes(localPayment.status)) {
        console.log(`[Webhook ASAAS] Payment ${asaasPaymentId} already in terminal status — skipping`);
        return res.status(200).json({ received: true });
      }

      const newStatus = event === "PAYMENT_RECEIVED" ? "RECEIVED" : "CONFIRMED";
      const paymentDate = payment.paymentDate || new Date().toISOString().split("T")[0];
      const eventId: string | null = typeof webhookEventId === "string" && webhookEventId ? webhookEventId : null;

      // Atomic status update: only the first concurrent caller succeeds.
      // The WHERE clause guards on both the terminal-status check AND the
      // webhook event ID so neither concurrent delivery nor exact-event replay
      // can win the race twice.
      const claimed = await storage.atomicConfirmAsaasPayment(localPayment.id, newStatus, paymentDate, eventId);
      if (!claimed) {
        console.log(`[Webhook ASAAS] Payment ${asaasPaymentId} already claimed (concurrent or replayed event) — skipping`);
        return res.status(200).json({ received: true });
      }
      console.log(`[Webhook ASAAS] Payment ${asaasPaymentId} updated to ${newStatus}`);

      let order = await storage.getOrderByPaymentId(localPayment.id);

      if (order) {
        await storage.updateOrder(order.id, { status: "confirmed" });
        console.log(`[Webhook ASAAS] Order ${order.orderId} updated to confirmed`);
      } else {
        const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
        const orderId = `ZK-${Date.now()}-${randomSuffix}`;

        let customerName = "Cliente";
        const asaasCustomer = localPayment.asaasCustomerId
          ? await storage.getAsaasCustomerById(localPayment.asaasCustomerId)
          : null;
        if (asaasCustomer) {
          customerName = asaasCustomer.name;
        }

        order = await storage.createOrder({
          orderId,
          userId: localPayment.userId,
          customer: customerName,
          date: new Date().toISOString(),
          status: "confirmed",
          total: localPayment.value,
          items: 1,
          paymentId: localPayment.id,
        });
        console.log(`[Webhook ASAAS] Order ${orderId} created as confirmed`);
      }

      let customerEmail: string | null = null;
      let customerNameForEmail = "Cliente";
      if (localPayment.asaasCustomerId) {
        const asaasCustomer = await storage.getAsaasCustomerById(localPayment.asaasCustomerId);
        if (asaasCustomer) {
          customerEmail = asaasCustomer.email;
          customerNameForEmail = asaasCustomer.name;
        }
      }

      if (customerEmail && order) {
        sendOrderConfirmationEmail({
          customerEmail,
          customerName: customerNameForEmail,
          orderId: order.orderId,
          items: order.items,
          total: localPayment.value,
          billingType: localPayment.billingType,
          paymentDate,
        }).catch((err) => console.error("[Webhook ASAAS] Failed to send confirmation email:", err));
      }

      // Notify admin only after ASAAS confirms the payment — never at QR-code
      // generation time. This prevents bots from spamming admin notifications
      // by generating PIX QR codes they never pay.
      if (order) {
        sendAdminNotification("order", {
          email: customerEmail || undefined,
          name: customerNameForEmail,
          total: localPayment.value,
          orderId: order.orderId,
          items: typeof order.items === "number" ? order.items : 1,
        }).catch((err) => console.error("[Webhook ASAAS] Failed to send admin order notification:", err));
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error(`[Webhook ASAAS] Internal error processing webhook: ${msg}`);
      return res.status(200).json({ received: true });
    }
  });

  // ============ PAYMENT ROUTES (ASAAS) ============

  // Rate limiter for payment status/simulate routes (permissive — used for polling)
  const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
      message: "Muitas tentativas de pagamento. Tente novamente em 15 minutos.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Dedicated rate limiter for PIX and credit-card *creation* routes.
  // Kept tighter than the shared limiter to prevent bots from generating
  // unlimited fake QR codes / fake orders per IP per hour.
  const pixCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1-hour window
    max: 5,                    // 5 payment creation attempts per IP per hour
    message: {
      message: "Muitas tentativas de pagamento. Tente novamente em uma hora.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Check if Asaas is configured
  app.get("/api/payments/config", publicCatalogLimiter, async (req, res) => {
    res.json({
      configured: asaas.isAsaasConfigured(),
      sandbox: asaas.isSandboxMode(),
    });
  });

  // Create PIX payment
  app.post(
    "/api/payments/pix",
    requireAuth,
    pixCreationLimiter,
    paymentLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!asaas.isAsaasConfigured()) {
          return res
            .status(503)
            .json({ message: "Sistema de pagamento não configurado" });
        }

        const validationResult = createPixPaymentSchema.safeParse(req.body);
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map((e) => e.message);
          return res.status(400).json({ message: errors.join(", ") });
        }

        const data = validationResult.data;

        // Compute server-side total from authoritative product prices + shipping
        let serverSubtotal = 0;
        for (const item of data.cartItems) {
          const product = await storage.getProductById(item.productId);
          if (!product) {
            return res.status(400).json({ message: `Produto não encontrado: ${item.productId}` });
          }
          let itemPrice = product.price;
          if (item.stoneType && product.stoneVariations) {
            try {
              const variations = JSON.parse(product.stoneVariations) as Array<{ name: string; price: number }>;
              const variation = variations.find((v) => v.name === item.stoneType);
              if (variation && variation.price > 0) {
                itemPrice = variation.price;
              }
            } catch {
              // fall back to base price
            }
          }
          serverSubtotal += itemPrice * item.quantity;
        }
        const serverShipping = calculateShippingFromCep(data.postalCode);
        const serverTotal = serverSubtotal + serverShipping;

        // Create or get Asaas customer
        const asaasCustomer = await asaas.createOrGetAsaasCustomer({
          name: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          phone: data.phone,
        });

        // Save customer locally if not exists
        let localCustomer = await storage.getAsaasCustomerByAsaasId(
          asaasCustomer.id,
        );
        if (!localCustomer) {
          localCustomer = await storage.createAsaasCustomer({
            email: data.email,
            name: data.name,
            cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
            phone: data.phone,
            asaasId: asaasCustomer.id,
            createdAt: new Date().toISOString(),
          });
        }

        // Create PIX payment using server-computed total
        const payment = await asaas.createPixPayment(asaasCustomer.id, data, serverTotal);

        // Get QR Code
        const qrCode = await asaas.getPixQrCode(payment.id);

        // Save payment locally
        const userId = (req as any).user?.id || null;
        const localPayment = await storage.createAsaasPayment({
          asaasCustomerId: localCustomer.id,
          asaasPaymentId: payment.id,
          userId,
          billingType: "PIX",
          value: serverTotal,
          status: payment.status,
          dueDate: payment.dueDate,
          invoiceUrl: payment.invoiceUrl,
          pixQrCodeImage: qrCode.encodedImage,
          pixQrCodePayload: qrCode.payload,
          createdAt: new Date().toISOString(),
        });

        // Register payment in session so the same browser can poll status
        const sess = (req as any).session;
        if (sess) {
          sess.allowedPaymentIds = [...(sess.allowedPaymentIds || []), localPayment.id];
        }

        // Admin notification is sent by the webhook handler after the payment
        // is confirmed by ASAAS (PAYMENT_CONFIRMED / PAYMENT_RECEIVED events).
        // Notifying here — before any money moves — would let bots spam the
        // admin inbox simply by generating QR codes they never pay.
        res.json({
          paymentId: localPayment.id,
          asaasPaymentId: payment.id,
          status: payment.status,
          qrCodeImage: qrCode.encodedImage,
          qrCodePayload: qrCode.payload,
          expirationDate: qrCode.expirationDate,
          invoiceUrl: payment.invoiceUrl,
        });
      } catch (err: any) {
        console.error("Error creating PIX payment:", err);
        res
          .status(400)
          .json({ message: "Não foi possível processar o pagamento PIX. Verifique os dados e tente novamente." });
      }
    },
  );

  // Create Credit Card payment
  app.post(
    "/api/payments/credit-card",
    requireAuth,
    pixCreationLimiter,
    paymentLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!asaas.isAsaasConfigured()) {
          return res
            .status(503)
            .json({ message: "Sistema de pagamento não configurado" });
        }

        const validationResult = createCreditCardPaymentSchema.safeParse(
          req.body,
        );
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map((e) => e.message);
          return res.status(400).json({ message: errors.join(", ") });
        }

        const data = validationResult.data;
        const remoteIp = getClientIp(req) || "127.0.0.1";

        // Compute server-side total from authoritative product prices + shipping + interest
        let ccServerSubtotal = 0;
        for (const item of data.cartItems) {
          const product = await storage.getProductById(item.productId);
          if (!product) {
            return res.status(400).json({ message: `Produto não encontrado: ${item.productId}` });
          }
          let itemPrice = product.price;
          if (item.stoneType && product.stoneVariations) {
            try {
              const variations = JSON.parse(product.stoneVariations) as Array<{ name: string; price: number }>;
              const variation = variations.find((v) => v.name === item.stoneType);
              if (variation && variation.price > 0) {
                itemPrice = variation.price;
              }
            } catch {
              // fall back to base price
            }
          }
          ccServerSubtotal += itemPrice * item.quantity;
        }
        const ccServerShipping = calculateShippingFromCep(data.postalCode);
        const ccServerBase = ccServerSubtotal + ccServerShipping;
        const ccInstallments = data.installmentCount && data.installmentCount > 1 ? data.installmentCount : 1;
        const { installmentValue: ccInstallmentValue, totalWithInterest: ccServerTotal } =
          calculateInstallmentWithInterest(ccServerBase, ccInstallments);

        // Create or get Asaas customer
        const asaasCustomer = await asaas.createOrGetAsaasCustomer({
          name: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          phone: data.phone,
        });

        // Save customer locally if not exists
        let localCustomer = await storage.getAsaasCustomerByAsaasId(
          asaasCustomer.id,
        );
        if (!localCustomer) {
          localCustomer = await storage.createAsaasCustomer({
            email: data.email,
            name: data.name,
            cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
            phone: data.phone,
            asaasId: asaasCustomer.id,
            createdAt: new Date().toISOString(),
          });
        }

        // Create Credit Card payment using server-computed total
        const payment = await asaas.createCreditCardPayment(
          asaasCustomer.id,
          data,
          remoteIp,
          ccServerTotal,
        );

        // Save payment locally
        const ccUserId = (req as any).user?.id || null;
        const localPayment = await storage.createAsaasPayment({
          asaasCustomerId: localCustomer.id,
          asaasPaymentId: payment.id,
          userId: ccUserId,
          billingType: "CREDIT_CARD",
          value: ccServerTotal,
          status: payment.status,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
          invoiceUrl: payment.invoiceUrl,
          creditCardLastDigits: payment.creditCard?.creditCardNumber,
          creditCardBrand: payment.creditCard?.creditCardBrand,
          createdAt: new Date().toISOString(),
        });

        // Register payment in session so the same browser can poll status (guest checkout)
        const ccSess = (req as any).session;
        if (ccSess) {
          ccSess.allowedPaymentIds = [...(ccSess.allowedPaymentIds || []), localPayment.id];
        }

        res.json({
          paymentId: localPayment.id,
          asaasPaymentId: payment.id,
          status: payment.status,
          invoiceUrl: payment.invoiceUrl,
          creditCardLastDigits: payment.creditCard?.creditCardNumber,
          creditCardBrand: payment.creditCard?.creditCardBrand,
          subtotal: ccServerSubtotal,
          shipping: ccServerShipping,
          installmentCount: ccInstallments,
          installmentValue: ccInstallmentValue,
          total: ccServerTotal,
        });
      } catch (err: any) {
        console.error("Error creating Credit Card payment:", err);
        // Return a generic message regardless of the gateway's specific decline
        // reason. Reflecting the raw error would let attackers use this endpoint
        // as a card-testing oracle (live vs. declined vs. invalid card).
        res.status(400).json({
          message: "Não foi possível processar o pagamento com cartão. Verifique os dados e tente novamente.",
        });
      }
    },
  );

  // Get payment status
  app.get(
    "/api/payments/:paymentId/status",
    paymentLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const paymentIdNum = parseInt(req.params.paymentId, 10);
        if (!Number.isInteger(paymentIdNum) || paymentIdNum <= 0) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }
        const reqUser = (req as any).user;
        const sessionAllowed: number[] = (req as any).session?.allowedPaymentIds || [];

        const isAdmin = reqUser?.role === "admin";
        const isAuthenticated = req.isAuthenticated?.();
        // Session ownership is only a valid credential for unauthenticated (guest) callers.
        // For authenticated users, userId must match — ignoring session ownership prevents
        // a leftover allowedPaymentIds entry from bypassing the per-user ownership check.
        const isGuestSessionOwner = !isAuthenticated && sessionAllowed.includes(paymentIdNum);

        if (!isAdmin && !isAuthenticated && !isGuestSessionOwner) {
          return res.status(401).json({ message: "Não autenticado" });
        }

        const localPayment = await storage.getAsaasPaymentById(paymentIdNum);
        if (!localPayment) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        // Authenticated non-admin users must own the payment.
        // Return 404 (not 403) to avoid leaking existence of other users' payments.
        if (isAuthenticated && !isAdmin && localPayment.userId !== reqUser?.id) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        // Get latest status from Asaas
        const asaasPayment = await asaas.getPaymentStatus(
          localPayment.asaasPaymentId,
        );

        // Polling may only update non-terminal → non-terminal transitions.
        // It must NEVER write CONFIRMED or RECEIVED to the local DB, even when
        // Asaas reports those statuses. Writing a terminal status here would
        // cause the webhook handler to see "already terminal" on arrival and
        // skip order creation and confirmation emails entirely.
        // The webhook's atomicConfirmAsaasPayment is the only authorised path
        // to terminal status; it includes atomic deduplication and triggers the
        // full post-payment flow (order, emails, admin notification).
        const terminalStatuses = ["CONFIRMED", "RECEIVED"];
        const alreadyTerminal = terminalStatuses.includes(localPayment.status);
        const incomingIsTerminal = terminalStatuses.includes(asaasPayment.status);
        if (!alreadyTerminal && !incomingIsTerminal && asaasPayment.status !== localPayment.status) {
          await storage.updateAsaasPayment(localPayment.id, {
            status: asaasPayment.status,
            paymentDate: asaasPayment.paymentDate,
          });
        }

        // Return the Asaas-reported status so the client's polling loop can
        // display "payment confirmed" to the user while the webhook races to
        // complete the server-side flow. The local DB update is intentionally
        // withheld for terminal statuses so the webhook always runs its path.
        res.json({
          paymentId: localPayment.id,
          status: asaasPayment.status,
          paymentDate: asaasPayment.paymentDate,
          billingType: localPayment.billingType,
        });
      } catch (err: any) {
        console.error("Error getting payment status:", err);
        res.status(400).json({
          message: "Erro ao consultar status do pagamento. Tente novamente.",
        });
      }
    },
  );

  // Sandbox: Simulate payment confirmation.
  //
  // Defense in depth:
  //   1. Hard 404 in production — the route does not exist outside non-prod
  //      environments, regardless of ASAAS_SANDBOX. Startup also enforces
  //      ASAAS_SANDBOX=false in production, so this is belt-and-suspenders.
  //   2. requireAuth — anonymous callers cannot confirm payments.
  //   3. csrfProtection — state-mutating endpoint, must include the session
  //      CSRF token like every other authenticated mutation.
  //   4. Ownership check — only the payment's owner (or admin) may simulate
  //      its confirmation, even within a test environment. Returns 404 (not
  //      403) on mismatch to avoid leaking the existence of other users'
  //      payment IDs (which are predictable serial integers).
  //   5. isSandboxMode() — final guard against the asaas client being in
  //      production mode regardless of the route being reachable.
  app.post(
    "/api/payments/:paymentId/simulate-payment",
    // Production hard-block runs FIRST — before paymentLimiter — so that even
    // high-rate callers in production receive 404 (not 429). 429 would leak
    // the existence of this route.
    (req: Request, res: Response, next: NextFunction) => {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ message: "Não encontrado" });
      }
      next();
    },
    paymentLimiter,
    requireAuth,
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!asaas.isSandboxMode()) {
          return res.status(403).json({
            message: "Esta função só está disponível em ambiente Sandbox",
          });
        }

        const paymentIdNum = parseInt(req.params.paymentId, 10);
        if (!Number.isInteger(paymentIdNum) || paymentIdNum <= 0) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        const localPayment = await storage.getAsaasPaymentById(paymentIdNum);
        if (!localPayment) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        // Ownership check — only the payment's owner (or admin) may simulate
        // confirmation. requireAuth guarantees req.user is present.
        const reqUser = req.user!;
        const isAdmin = reqUser.role === "admin";
        if (!isAdmin && localPayment.userId !== reqUser.id) {
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        // Confirm payment in sandbox (returns simulated confirmed status)
        const asaasPayment = await asaas.confirmSandboxPayment(
          localPayment.asaasPaymentId,
        );

        // Update local status
        await storage.updateAsaasPayment(localPayment.id, {
          status: asaasPayment.status,
          paymentDate:
            asaasPayment.paymentDate || new Date().toISOString().split("T")[0],
        });

        res.json({
          paymentId: localPayment.id,
          status: asaasPayment.status,
          message: "Pagamento confirmado com sucesso (simulação)",
        });
      } catch (err: any) {
        console.error("Error simulating payment:", err);
        res
          .status(400)
          .json({ message: "Erro ao simular pagamento. Tente novamente." });
      }
    },
  );

  return httpServer;
}
