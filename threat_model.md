# Threat Model

## Application summary
- Production app is a TypeScript monolith with a React/Vite frontend in `client/` and an Express/PostgreSQL backend in `server/`.
- The production entry point is `server/index.ts`, which serves the API and the built frontend.
- Core security-sensitive logic lives in `server/routes.ts`, with persistence in `server/storage.ts` and schemas in `shared/schema.ts`.

## Production-scope assumptions
- Only production-reachable behavior is in scope.
- `NODE_ENV=production` in deployed environments.
- TLS is provided by the platform.
- Mockup/dev sandboxes are not deployed to production.
- Findings should focus on real confidentiality, integrity, and availability impact for production users and operators.

## Assets
- User accounts, sessions, passwords, and reset / verification tokens
- Admin privileges and storefront management capabilities
- Customer PII: email, phone, CPF/CNPJ, addresses, consent history, audit history
- Order and payment records
- Payment operations through Asaas
- Brand content shown on the public storefront

## Trust boundaries
1. Browser ↔ Express API (`/api/*`)
2. Express session/auth boundary (Passport + `express-session` + PostgreSQL session store)
3. Express ↔ PostgreSQL via Drizzle in `server/storage.ts`
4. Express ↔ external services: Asaas (`server/asaas.ts`) and Resend (`server/email.ts`)
5. Public storefront data vs admin-only content management operations

## Roles
- Anonymous visitor
- Authenticated customer
- Authenticated admin
- External payment provider webhook caller

## In-scope attack surfaces
- Authentication and session management in `server/routes.ts`
- Authorization middleware and route-level access control in `server/routes.ts`
- Payment creation, payment status, and webhook flows in `server/routes.ts` and `server/asaas.ts`
- User privacy / LGPD endpoints in `server/routes.ts` and `server/storage.ts`
- Content-management endpoints for products, categories, collections, journal, branding, subscribers, customers, and orders
- Email-triggering flows and any user-controlled content passed to email templates in `server/email.ts`

## Out-of-scope / deprioritized areas
- Development-only Vite middleware in `server/vite.ts`
- Build scripts and generated artifacts, including `dist/`
- Static screenshots / assets in the repository
- Sandbox-only payment simulation routes when they are unavailable in production
- Pure UX bugs without a security impact

## Threat priorities for this scan
1. Broken access control between customer and admin capabilities
2. Data exposure across tenant / user boundaries
3. Payment and order business-logic abuse
4. Weak webhook validation or payment state manipulation
5. Account recovery / session invalidation failures
6. Injection into emails or browser-rendered content where production exploitability is realistic

## Scan anchors
- `server/routes.ts`: `requireAuth`, `requireAdmin`, auth flows, `/api/orders`, `/api/payments/*`, `/api/webhooks/asaas`, content-management routes
- `server/storage.ts`: `getOrders`, payment lookup methods, LGPD aggregation methods
- `shared/schema.ts`: request validation for auth and payment flows
- `client/src/pages/Checkout.tsx`: client-controlled payment fields
- `server/email.ts`: HTML template interpolation

## Current scan notes
- Deterministic scan output currently includes noisy findings against generated/minified code and needs manual triage.
- Confirmed production issues concentrate in three areas: CMS/admin authorization, cross-user order/payment exposure, and client-trusted payment totals.
- Reviewed but not proposed this scan: low-confidence session fixation hardening, email-client-dependent HTML injection, audit-log IP spoofing, and LGPD export retention concerns without a standalone external exploit chain.
