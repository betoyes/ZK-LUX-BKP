# Threat Model

## Application summary
- Production app is a TypeScript monolith with a React/Vite frontend in `client/` and an Express/PostgreSQL backend in `server/`.
- The production entry point is `server/index.ts`, which serves the API and the built frontend.
- Core security-sensitive logic lives in `server/routes.ts`, with persistence in `server/storage.ts`, request parsing and logging in `server/index.ts`, payment integration in `server/asaas.ts`, and email delivery in `server/email.ts`.

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
- Application logs, which may contain security-relevant data if debug logging is left enabled

## Trust boundaries
1. Browser ↔ Express API (`/api/*`)
2. Express session/auth boundary (Passport + `express-session` + PostgreSQL session store)
3. Express ↔ PostgreSQL via Drizzle in `server/storage.ts`
4. Express ↔ external services: Asaas (`server/asaas.ts`) and Resend (`server/email.ts`)
5. Public storefront data vs admin-only content management operations
6. Application ↔ production log sink / observability tooling

## Roles
- Anonymous visitor
- Authenticated customer
- Authenticated admin
- External payment provider webhook caller
- Internal operator with application-log access

## In-scope attack surfaces
- Authentication and session management in `server/routes.ts`
- Authorization middleware and route-level access control in `server/routes.ts`
- Account recovery and email-link generation in `server/routes.ts` and `server/email.ts`
- Request parsing, logging, and middleware ordering in `server/index.ts`
- Payment creation, payment status, and webhook flows in `server/routes.ts` and `server/asaas.ts`
- User privacy / LGPD endpoints in `server/routes.ts` and `server/storage.ts`
- Content-management endpoints for products, categories, collections, journal, branding, subscribers, customers, and orders
- Email-triggering flows and any user-controlled content passed to email templates in `server/email.ts`

## Out-of-scope / deprioritized areas
- Development-only Vite middleware in `server/vite.ts`
- Build scripts and generated artifacts, including `dist/`
- Static screenshots / assets in the repository
- Sandbox-only payment simulation behavior unless production reachability is demonstrated
- Pure UX bugs without a security impact
- Admin-only content shaping that does not create a meaningful new privilege boundary or external exploit path

## Threat priorities for this scan
1. Broken access control between customer and admin capabilities
2. Data exposure across user, operator, or log-access boundaries
3. Account recovery / session invalidation failures
4. Payment and order business-logic abuse
5. Weak webhook validation or payment state manipulation
6. Availability risks on public API boundaries

## Scan anchors
- `server/index.ts`: body-parser limits, response logging, production middleware ordering
- `server/routes.ts`: `requireAuth`, `requireAdmin`, auth flows, `/api/orders`, `/api/payments/*`, `/api/webhooks/asaas`, LGPD routes, content-management routes
- `server/storage.ts`: payment lookup methods, LGPD aggregation methods, session-related data access patterns
- `shared/schema.ts`: request validation for auth and payment flows
- `server/email.ts`: security-sensitive link generation and email templates
- `client/src/pages/Checkout.tsx`: client/payment interaction points to confirm server-side validation

## Current scan notes
- Deterministic scans produced only low/medium candidates and required manual triage; no critical/high scanner finding was accepted without code validation.
- Confirmed production-impact issues in the current code are concentrated in these areas:
  - soft-deleted accounts remain login-capable because auth paths do not enforce `deletedAt`
  - LGPD deletion/anonymization only revoke the current session, not all active sessions
  - the sandbox payment-simulation endpoint is publicly callable when `ASAAS_SANDBOX` is left at the code's insecure default
  - user-controlled fields are interpolated into operator notification emails without HTML escaping
- Re-validated as fixed and not reproposed:
  - host-header injection into password-reset and verification emails
  - missing session revocation after an authenticated password change
  - globally oversized request-body parsing that exposed public endpoints to denial of service
  - full API-response logging that copied PII, CSRF tokens, payment data, and LGPD export data into logs
  - prior client-trusted payment totals
  - prior payment-status ownership gap / payment IDOR concerns
  - production webhook authentication for Asaas when properly configured
- Reviewed but not proposed this scan:
  - `GET /api/payments/config` sandbox disclosure because it is mainly supportive/derivative once the payment-simulation route is fixed
  - missing explicit CSRF middleware on admin mutation routes because the production session cookie is explicitly `SameSite=Lax`, and no production-reachable bypass was demonstrated beyond unsupported browser assumptions
  - admin-controlled product-media MIME issues because they did not create a meaningful new privilege boundary beyond existing admin control
  - `?full=true` product responses because the underlying media is already public and the remaining concern is mainly performance/design intent rather than a strong confidentiality issue
