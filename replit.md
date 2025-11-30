# ZK REZK - Luxury Jewelry E-commerce Platform

## Overview

ZK REZK is a full-stack luxury jewelry e-commerce application built with a modern monorepo architecture. The platform features a sophisticated React frontend with a Node.js/Express backend, utilizing PostgreSQL (via Neon) for data persistence. The application emphasizes elegant design, smooth user experiences, and a comprehensive admin dashboard for content management.

The platform serves as both a customer-facing storefront and an administrative content management system for managing products, collections, journal posts, and customer orders. It implements session-based authentication with role-based access control (admin vs. customer users).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured for hot module replacement
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and data fetching

**UI Component Strategy**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** with custom configuration for utility-first styling
- **Framer Motion** for animations and page transitions
- **Custom design system** with luxury jewelry aesthetic (serif/display fonts, brutalist modern design)

**State Management Approach**
- **ProductContext** provides global state for products, categories, collections, wishlist, branding, and journal posts
- **AuthContext** manages user authentication state and login/logout operations
- React Context API used instead of Redux/Zustand for simpler state management
- TanStack Query handles server state caching and synchronization

**Key Design Decisions**
- Monolithic context providers centralize business logic
- Custom hooks (useProducts, useAuth, useToast) abstract context consumption
- Image assets stored in `attached_assets` directory, imported as modules
- Mobile-first responsive design with breakpoint utilities

### Backend Architecture

**Server Framework**
- **Express.js** REST API with TypeScript
- **Session-based authentication** using express-session with connect-pg-simple for PostgreSQL session storage
- **Passport.js** with local strategy for username/password authentication
- **bcrypt** for password hashing

**Database Layer**
- **Drizzle ORM** for type-safe database queries and schema management
- **Neon Serverless PostgreSQL** as the database provider
- Schema defined in `shared/schema.ts` for code sharing between client and server
- WebSocket constructor (ws) configured for Neon's serverless connection pooling

**Authentication & Authorization**
- Session cookies with secure HttpOnly settings
- Role-based middleware (`requireAuth`, `requireAdmin`) for route protection
- Separate admin and customer user roles in the same users table
- Password hashing with bcrypt (10 rounds)
- Email verification required for customer accounts before login
- Password reset via secure email tokens (1-hour expiry)
- Email verification tokens (24-hour expiry)
- Resend integration for transactional emails

**API Design**
- RESTful endpoints under `/api` namespace
- Organized by resource (auth, products, categories, collections, journal, orders, customers)
- CRUD operations for all major entities
- Validation using Zod schemas derived from Drizzle schemas

**Code Organization**
- `server/routes.ts`: API endpoint registration and middleware configuration
- `server/storage.ts`: Database abstraction layer (repository pattern)
- `server/db.ts`: Database connection and Drizzle initialization
- `shared/schema.ts`: Shared database schema and validation schemas

### Build & Deployment

**Development Workflow**
- `npm run dev`: Runs Express server with Vite middleware for HMR
- `npm run dev:client`: Standalone Vite development server
- Custom Vite plugins for runtime error overlay and meta image management

**Production Build**
- `npm run build`: Custom esbuild script bundles server code
- Allowlist strategy for bundling specific dependencies to reduce cold start times
- Client assets built with Vite to `dist/public`
- Server bundled to single `dist/index.cjs` file

**Build Strategy Rationale**
- esbuild chosen for fast server bundling vs. traditional tsc compilation
- Selective dependency bundling reduces syscall overhead in serverless environments
- Monolithic server bundle improves cold start performance

### Data Schema

**Core Entities**
- **Users**: Authentication (admin/customer roles) with emailVerified flag
- **Categories**: Product categorization (rings, necklaces, earrings, bracelets)
- **Collections**: Curated product groupings (Eternal, Aurora, etc.)
- **Products**: Jewelry items with pricing, images, specs, bestseller/new flags
- **Journal Posts**: Editorial content with categories and excerpts
- **Subscribers**: Email list with segmentation (newsletter, lead, customer types)
- **Customers**: Extended customer profiles (separate from users)
- **Orders**: Purchase records with status tracking
- **Branding**: Configurable site content (hero text, manifesto, company name)
- **EmailVerificationTokens**: Tokens for email confirmation (24-hour expiry)
- **PasswordResetTokens**: Tokens for password recovery (1-hour expiry, single-use)

**Schema Design Decisions**
- Relational structure with foreign keys (categoryId, collectionId on products)
- Text fields for images (supports both base64 and URLs)
- Boolean flags for product features (isNew, isBestseller)
- Denormalized branding table (single row configuration)
- Serial IDs for auto-incrementing primary keys

## External Dependencies

### Database & ORM
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver with WebSocket support
- **drizzle-orm**: Type-safe ORM with schema builder
- **drizzle-kit**: CLI for migrations and schema management

### UI & Styling
- **@radix-ui/***: Unstyled, accessible component primitives (30+ components)
- **tailwindcss**: Utility-first CSS framework with JIT compiler
- **framer-motion**: Declarative animations library
- **lucide-react**: Icon library

### Forms & Validation
- **react-hook-form**: Performant form state management
- **@hookform/resolvers**: Form validation resolver adapters
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Auto-generates Zod schemas from Drizzle tables

### Authentication
- **passport**: Authentication middleware
- **passport-local**: Username/password strategy
- **bcrypt**: Password hashing
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **vite**: Next-generation frontend tooling
- **esbuild**: Fast JavaScript bundler for server code
- **tsx**: TypeScript execution for development
- **@replit/vite-plugin-***: Replit-specific development plugins

### Routing & State
- **wouter**: Minimalist router (2KB)
- **@tanstack/react-query**: Async state management

### Carousel
- **embla-carousel-react**: Lightweight carousel library
- **embla-carousel-autoplay**: Autoplay plugin for carousels

### Asset Management
- Custom Vite plugin (`vite-plugin-meta-images.ts`) for OpenGraph image URL generation
- Static asset serving from `client/public` directory
- Image imports from `attached_assets` directory

### Notable Third-Party Services
- **Neon Database**: Serverless Postgres with connection pooling
- Designed for potential integration with Stripe (dependency present but not implemented)
- **Resend**: Email service for transactional emails (verification, password reset, admin notifications)

## Email Automation

**Admin Notifications**
- Email notifications are sent to betoyes@gmail.com for:
  - New newsletter subscriptions (`/api/subscribers`)
  - New user registrations (`/api/auth/register`)
  - New customer creations (`/api/customers`)
  - New order placements (`/api/orders`)
- Notifications are sent asynchronously and don't block the main response
- Implementation in `server/email.ts` using `sendAdminNotification()` function

**Transactional Emails**
- Email verification for new customer accounts
- Password reset links (1-hour expiry)
- Fallback to onboarding@resend.dev if domain not verified

## Recent Changes (November 2025)

1. **CRUD Persistence Fixed**: ProductContext now calls backend APIs instead of only updating local state
2. **Type System Fixed**: All CRUD functions properly typed as `Promise<void>`, numeric IDs for categories/collections
3. **Newsletter Endpoint Fixed**: `/api/subscribers` auto-generates date field
4. **Email Automation Implemented**: Admin notifications for leads, subscribers, customers, and orders
5. **Price Formatting**: R$ Brazilian format with conversion to/from INTEGER centavos in database