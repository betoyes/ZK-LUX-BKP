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
- The deployment is assumed to sit behind the platform-managed reverse proxy chain that matches `app.set("trust proxy", 1)`; do not treat `X-Forwarded-For` spoofing as exploitable without production evidence that client-supplied header values survive to `req.ip`.

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
- Platform-specific reverse-proxy header handling claims unless the scan shows that forged client headers are actually trusted in production

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
  - public authentication endpoints disclose whether an email address exists and whether it is already verified, enabling account enumeration
  - unauthenticated PIX checkout creates pending local orders and sends admin sale notifications before settlement, enabling fake-order spam and business-metric pollution
  - account anonymization frees the original email in `users` but LGPD aggregation still links `subscribers` / `customers` / `orders` by email, so a later account reusing that address can receive prior-user data
  - public product variant media endpoints for `version1` / `version2` / `version3` miss the catalog limiter and can force repeated DB fetch + base64 decode work on large media blobs
- Re-validated as fixed and not reproposed:
  - `POST /api/auth/login` now enforces a valid CSRF token, so the prior login-CSRF / session-swapping issue was not reproduced
  - `GET /api/auth/csrf-token` now returns a stateless token for anonymous callers without seeding PostgreSQL sessions, so the prior anonymous session-store exhaustion path was not reproduced
  - `POST /api/subscribers` now has a dedicated limiter, so the prior anonymous admin-email / quota abuse path is no longer present in the same form
  - logout destroys the server-side session and clears `connect.sid`, so stale guest payment authorization data is not inherited by later users of the same browser session
  - login regenerates the session before `req.logIn(...)`, addressing the prior session fixation concern
  - order-confirmation emails now escape checkout `name`, closing the prior HTML email injection path
  - deleted or anonymized accounts are blocked from login and deserialization
  - account deletion, anonymization, and authenticated password changes revoke all active sessions
  - host-header injection into password-reset and verification emails
  - globally oversized request-body parsing on public endpoints
  - full API-response logging that copied PII, CSRF tokens, payment data, and LGPD export data into logs
  - prior client-trusted payment totals
  - payment-status ownership checks between distinct authenticated users
  - production webhook authentication for Asaas when properly configured
  - HTML escaping in admin/operator notification emails
- Reviewed but not proposed this scan:
  - `GET /api/payments/config` sandbox disclosure because it is mainly supportive/derivative once the payment-simulation route is fixed
  - missing explicit CSRF middleware on admin mutation routes because the production session cookie is explicitly `SameSite=Lax`, and no production-reachable bypass was demonstrated beyond unsupported browser assumptions
  - admin-controlled product-media MIME issues because they did not create a meaningful new privilege boundary beyond existing admin control
  - `?full=true` product responses because the underlying media is already public and the remaining concern is mainly performance/design intent rather than a strong confidentiality issue
  - missing startup validation for `ASAAS_WEBHOOK_TOKEN` because it is an operator-misconfiguration availability failure, not an external attacker exploit path
  - storing LGPD export payloads in `data_export_requests.downloadUrl` because it does not materially expand exposure beyond existing database access and was treated as privacy hardening rather than a distinct exploitable vulnerability
  - the raw `x-forwarded-for` helper used for audit/payment metadata, because this scan did not establish production evidence that attacker-supplied forwarded values survive the platform proxy chain in an exploitable way
  - anonymous subscriber `type` selection because it mainly pollutes business funnel data without crossing a meaningful security boundary
  - limited email-address logging in `server/email.ts`, because it did not rise to the level of a distinct externally exploitable exposure after the broader API-response logging issue was fixed
  - credit-card response handling stores only Asaas last-four data rather than full PAN, so it was not treated as card-data exposure
