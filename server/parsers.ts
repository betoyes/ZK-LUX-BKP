import express from "express";

// Small parsers for all public and standard authenticated routes.
export const smallJsonParser = express.json({
  limit: '100kb',
  verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
});
export const smallUrlencodedParser = express.urlencoded({ extended: false, limit: '100kb' });

// Large parsers for admin-only product routes that handle base64-encoded image
// uploads. These MUST only be applied as inline per-route middleware AFTER
// requireAdmin has verified authentication and admin privileges, so that
// unauthenticated callers never force the server to buffer 10 MB of
// attacker-controlled data.
export const adminLargeJsonParser = express.json({
  limit: '10mb',
  verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
});
export const adminLargeUrlencodedParser = express.urlencoded({ extended: false, limit: '10mb' });
