import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import compression from "compression";
import { storage } from "./storage";


const app = express();
app.set("trust proxy", 1);
app.use(compression());
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === "production";

// Security headers with Helmet
app.use(
  helmet({
    // HSTS: only in production (requires HTTPS)
    strictTransportSecurity: isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    // Prevent clickjacking
    frameguard: { action: "deny" },
    // Prevent MIME type sniffing
    noSniff: true,
    // Referrer policy for privacy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // CSP: conservative policy that works with Vite/React
    // - 'self' for scripts/styles from same origin
    // - 'unsafe-inline' needed for Vite HMR in dev and React inline styles
    // - 'unsafe-eval' needed for Vite HMR in dev mode only
    // - data: for inline images (base64)
    // - blob: for dynamic content
    // - wss: for Vite WebSocket HMR
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "data:", "blob:", "https:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"],
        connectSrc: isProduction
          ? ["'self'", "https:"]
          : ["'self'", "ws:", "wss:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // Prevent IE from executing downloads in site's context
    ieNoOpen: true,
    // DNS prefetch control
    dnsPrefetchControl: { allow: false },
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Admin product routes (POST /api/products, PATCH /api/products/:id) need large
// limits for base64-encoded image uploads. All other routes – including public
// unauthenticated endpoints – are capped at 100 kb to prevent DoS via oversized
// request bodies. This check must happen here, before any body parsing occurs,
// because Express rejects over-limit bodies before route handlers run.
const LARGE_BODY_PATHS = /^\/api\/products(\/\d+)?$/;
const LARGE_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const smallJsonParser = express.json({
  limit: '100kb',
  verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
});
const largeJsonParser = express.json({
  limit: '10mb',
  verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
});
const smallUrlencodedParser = express.urlencoded({ extended: false, limit: '100kb' });
const largeUrlencodedParser = express.urlencoded({ extended: false, limit: '10mb' });

// Reject unauthenticated callers that send oversized bodies to admin-only product
// routes BEFORE any body parser runs — evaluating Content-Length is a zero-cost
// header check that avoids buffering megabytes for requests that will be rejected
// by requireAdmin anyway. A missing session cookie is a reliable indicator of an
// unauthenticated caller; legitimate admins always have a session cookie.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!(LARGE_BODY_PATHS.test(req.path) && LARGE_BODY_METHODS.has(req.method))) {
    return next();
  }
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength <= 100 * 1024) return next();
  if (!req.headers.cookie) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const useLarge = LARGE_BODY_PATHS.test(req.path) && LARGE_BODY_METHODS.has(req.method);
  return (useLarge ? largeJsonParser : smallJsonParser)(req, res, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const useLarge = LARGE_BODY_PATHS.test(req.path) && LARGE_BODY_METHODS.has(req.method);
  return (useLarge ? largeUrlencodedParser : smallUrlencodedParser)(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // LGPD soft-delete cleanup: anonymize accounts whose 30-day retention window
  // has expired. Runs on startup and every 6 hours thereafter.
  async function runLgpdCleanup() {
    try {
      const purged = await storage.purgeExpiredSoftDeletedUsers();
      if (purged > 0) {
        log(`LGPD cleanup: anonymized ${purged} expired soft-deleted account(s)`, "lgpd");
      }
    } catch (err) {
      console.error("LGPD cleanup error:", err);
    }
  }
  runLgpdCleanup();
  setInterval(runLgpdCleanup, 6 * 60 * 60 * 1000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
