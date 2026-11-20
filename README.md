# Enterprise Event-Driven E-Commerce Monorepo

A production-grade, event-driven microservices architecture built with **Turborepo**, **NestJS 12**, **Next.js 16**, **Angular 22**, **CloudAMQP (RabbitMQ)**, and **Supabase (PostgreSQL + S3 Storage)**.

---

## System Architecture

```
                      ┌─────────────────────────┐     ┌─────────────────────────┐
                      │    apps/web-fe (:3000)  │     │   apps/admin-fe (:3001) │
                      │   Next.js 16 Storefront │     │    Angular 22 Dashboard │
                      └────────────┬────────────┘     └────────────┬────────────┘
                                   │                               │
                                   │ HTTPS (REST / JSON)           │ HTTPS (REST / JSON)
                                   ▼                               ▼
                      ┌─────────────────────────────────────────────────────────┐
                      │                 apps/api-gateway (:3002)                │
                      │  - Public Ingress, Rate Limiting & Swagger (/api/docs)  │
                      │  - Dual-Token Auth (JWT + httpOnly Refresh Cookie)      │
                      │  - Centralized Storage (Presigned S3 + Staging)         │
                      │  - Stripe Connect & Checkout Session Webhook Router     │
                      │  - Microservice Clients (CloudAMQP ClientProxies)       │
                      └─────────────┬──────────────────────────────┬────────────┘
                                    │                              │
          Direct Upload (PUT) 50MB  │                              │ Database Transactions
                                    ▼                              ▼
                 ┌──────────────────────────────────┐   ┌────────────────────────────────┐
                 │       SUPABASE S3 STORAGE        │   │      SUPABASE POSTGRESQL       │
                 │ - Bucket: TurboRepo              │   │ - Session Pooler (PgBouncer)   │
                 │ - Cloudflare Global CDN          │   │ - TypeORM Entities with UUIDs  │
                 │ - temp/ (Staging) -> permanent/  │   │ - Multi-Tenant store_orders    │
                 └──────────────────────────────────┘   └────────────────────────────────┘
                                    │
                                    │ Events & Commands
                                    ▼
             ┌──────────────────────────────────────────────────────────────────┐
             │               CLOUDAMQP (RABBITMQ MESSAGE BROKER)                │
             │  Topic Exchange: 'ecommerce_exchange'                            │
             │  Dead Letter Exchange: 'ecommerce_dlx' (DLQ Policy Active)       │
             └──────┬─────────────────┬──────────────────┬───────────────┬──────┘
                    │                 │                  │               │
  Routing: products.*│        orders.* │        billing.* │       email.* │
                    ▼                 ▼                  ▼               ▼
         ┌───────────────────┐ ┌───────────────────┐ ┌───────────┐ ┌───────────┐
         │ products-service  │ │  orders-service   │ │  billing  │ │   email   │
         │ - Pure Service    │ │ - Pure Service    │ │ - Service │ │ - Service │
         │ - products_queue  │ │ - orders_queue    │ │ - billing │ │ - email   │
         │ - Categories/Tree │ │ - 15m Hold Sweeper│ │   queue   │ │   queue   │
         │ - 2-Phase Stock   │ │ - Stripe Order Sync│ │           │ │ - RateLim │
         │ - Scoped Coupons  │ │ - Immutable Items │ │           │ │ - DLQ     │
         └───────────────────┘ └───────────────────┘ └───────────┘ └───────────┘
```

---

## Monorepo Structure

### Applications (`apps/`)

| Application | Technology | Port / Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **`web-fe`** | **Next.js 16** (React 19, App Router) | `http://localhost:3000` | Customer storefront for browsing, cart, and checkout. |
| **`admin-fe`** | **Angular 22** (SSR, TailwindCSS v4) | `http://localhost:3001` | Seller and administrator management portal. |
| **`api-gateway`** | **NestJS 12** (ESM, TypeORM, Swagger) | `http://localhost:3002` | Public ingress, auth, file staging, Stripe routes, and RPC proxying. |
| **`products-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`products_queue`) | Catalog management, category tree bubbling, two-phase inventory holds, coupons. |
| **`orders-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`orders_queue`) | Multi-tenant order lifecycle, 15-min temporary holds, auto-expiration sweeper. |
| **`billing-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`billing_queue`) | Invoicing, platform commission cuts, seller payout ledger. |
| **`email-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`email_queue`) | Paced transactional email delivery with DLQ. |

### Shared Packages (`packages/`)

* **`@repo/common` (`packages/common`)**: Single source of truth for microservice RPC patterns (`ORDER_PATTERNS`, `PRODUCT_PATTERNS`, `CATEGORY_PATTERNS`, `COUPON_PATTERNS`, `INVENTORY_PATTERNS`), domain events (`ORDER_EVENTS`, `EMAIL_EVENTS`, `BILLING_EVENTS`), status enums (`OrderStatus`, `ProductStatus`, `CouponScope`), and shared DTOs.
* **`@repo/ui` (`packages/ui`)**: Shared reusable UI component library.
* **`@repo/typescript-config` (`packages/typescript-config`)**: Base `tsconfig.json` compiler presets.
* **`@repo/eslint-config` (`packages/eslint-config`)**: Shared linting configs.

---

## Production-Grade Core Features

### 1. Catalog, Inventory & Promotions (`apps/products-service`)
* **Hierarchical Categories & Bubbling Up:** Nested self-referencing category trees (`parentId`). Querying a root category recursively bubbles up and aggregates all products from descendant subcategories via PostgreSQL Recursive CTEs.
* **Retail Price Enforcement:** Database-level `CHECK ("sellingPrice" <= "mrp")` constraint guarantees merchants cannot set a selling price higher than the Manufacturer Suggested Retail Price.
* **Two-Phase Inventory Management:**
  - `reserveStock`: Holds requested quantity during checkout.
  - `deductStock`: Permanently decrements reserved stock when Stripe payment succeeds.
  - `releaseStock`: Restores held stock if checkout is abandoned or expires.
* **Scoped Coupon Engine:** Cart calculation supporting `PERCENTAGE` and `FIXED_AMOUNT` discounts with minimum spend thresholds, expiration dates, usage limits, and maximum discount caps.

### 2. Multi-Tenant Order State Machine (`apps/orders-service`)
* **Multi-Tenant Schema (`store_orders` & `order_items`):** Strict data isolation scoped by `storeId` and `buyerId`.
* **Immutable Receipt Snapshotting:** `order_items` records point-in-time snapshots of product `title`, `price`, and `sku` to maintain financial audit integrity regardless of future catalog changes.
* **15-Minute Inventory Holds:** Orders are created with a 15-minute countdown (`expiresAt`).
* **Automated Expiration Sweeper:** Native background interval task runs every 60 seconds, sweeps expired pending orders, sets status to `EXPIRED`, and dispatches compensating events to release held stock.
* **Stripe Webhook Synchronization:** Real-time synchronization for `checkout.session.completed` (`PAID`) and `checkout.session.expired` (`EXPIRED` + stock release).

### 3. Two-Phase File Pipeline (Supabase S3 + Cloudflare CDN)
* **Presigned S3 Uploads (`POST /api/upload/presigned-url`)**: Direct browser-to-S3 uploads for files up to **50MB** with zero API Gateway server RAM overhead.
* **Two-Phase Staging & Relocation**: Files upload to `temp/` and are promoted via server-side S3 copy (`CopyObjectCommand`) to permanent directories (`avatars/`, `products/`) upon form confirmation.
* **Automatic Storage Hygiene**: Previous user avatars are deleted automatically upon update to prevent orphaned asset storage fees.
* **Global Cloudflare CDN**: Public assets are cached and delivered through Cloudflare's global edge network.

### 4. Event-Driven Messaging (CloudAMQP)
* **Topic Exchange (`ecommerce_exchange`)**: Decoupled pub/sub messaging allowing multiple microservices to react to domain events concurrently.
* **Dead Letter Queue (`email_dlq`)**: Dynamic RabbitMQ policy (`email_dlx_policy`) routes malformed or rejected messages (`nack`) to a quarantine queue, preventing queue freezing.
* **Queue Flow Control**: Configured with `prefetchCount: 5` and manual acknowledgment (`noAck: false`).
* **Velocity Rate Limiting**: Built-in Nodemailer connection pool throttles outbound emails (5/sec) to prevent Google SMTP concurrency blocks (`421` / `454`).

### 5. Dual-Token Authentication & PostgreSQL Database
* **Short-Lived Access Tokens (15 min)**: Passed via Authorization header for stateless route guarding.
* **Secure Refresh Tokens (7 days)**: Managed via `httpOnly`, `Secure`, `SameSite=Strict` cookies.
* **Complete Auth Lifecycle**: 6-digit email OTP verification, password reset, account management, and Role-Based Access Control (`ADMIN`, `SELLER`, `BUYER`).
* **Supabase IPv4 Session Pooler**: Uses PgBouncer on port `5432`/`6543` to multiplex thousands of microservice connections.

---

## Getting Started

### 1. Prerequisites
* **Node.js** `>= 22`
* **Yarn** `1.22.x`
* **CloudAMQP** (RabbitMQ cluster)
* **Supabase** (PostgreSQL + Storage)
* **Stripe Account** (Connect enabled)

### 2. Installation & Shared Package Build

```bash
# Install monorepo dependencies
yarn install

# Build shared contracts package
yarn workspace @repo/common build
```

---

## Environment Configuration

### `apps/api-gateway/.env`
```env
PORT=3002
NODE_ENV=development

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret_change_in_production
JWT_REFRESH_EXPIRATION=7d

# Supabase IPv4 Session Pooler
DATABASE_HOST=aws-1-ap-south-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_USER=postgres.your_project_ref
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=postgres

# CloudAMQP RabbitMQ
RABBITMQ_URL="amqps://user:pass@host.rmq2.cloudamqp.com/vhost"
RABBITMQ_EXCHANGE="ecommerce_exchange"

# S3 Storage Configuration (Supabase S3)
S3_ENDPOINT=https://your_project_ref.storage.supabase.co/storage/v1/s3
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your_s3_access_key_id
S3_SECRET_ACCESS_KEY=your_s3_secret_access_key
S3_BUCKET_NAME=TurboRepo
S3_PUBLIC_URL_PREFIX=https://your_project_ref.supabase.co/storage/v1/object/public/TurboRepo

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### `apps/products-service/.env`
```env
PORT=3003
NODE_ENV=development

# Supabase PostgreSQL
DATABASE_HOST=aws-1-ap-south-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_USER=postgres.your_project_ref
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=postgres

# CloudAMQP RabbitMQ
RABBITMQ_URL="amqps://user:pass@host.rmq2.cloudamqp.com/vhost"
RABBITMQ_EXCHANGE="ecommerce_exchange"
```

### `apps/orders-service/.env`
```env
PORT=3004
NODE_ENV=development

# Supabase PostgreSQL
DATABASE_HOST=aws-1-ap-south-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_USER=postgres.your_project_ref
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=postgres

# CloudAMQP RabbitMQ
RABBITMQ_URL="amqps://user:pass@host.rmq2.cloudamqp.com/vhost"
RABBITMQ_EXCHANGE="ecommerce_exchange"
```

### `apps/email-service/.env`
```env
PORT=3005
NODE_ENV=development

# SMTP Configuration (Gmail or AWS SES / Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS="your_16_digit_app_password"

# Queue Flow Control & SMTP Rate Limiting
RABBITMQ_PREFETCH=5
SMTP_RATE_LIMIT=5
SMTP_RATE_DELTA=1000

# CloudAMQP RabbitMQ
RABBITMQ_URL="amqps://user:pass@host.rmq2.cloudamqp.com/vhost"
RABBITMQ_EXCHANGE="ecommerce_exchange"
```

---

## Running the Services

### Run Entire Monorepo Simultaneously
```bash
yarn dev
```

### Run Backend Services Only
```bash
yarn turbo run dev --filter=api-gateway --filter=products-service --filter=orders-service --filter=billing-service --filter=email-service
```

### Run Frontends Only
```bash
# Next.js Storefront (:3000)
yarn turbo run dev --filter=web-fe

# Angular Admin Portal (:3001)
yarn turbo run dev --filter=admin-fe
```

---

## Interactive Documentation & Health Checks

* **Swagger OpenAPI Docs:** [http://localhost:3002/api/docs](http://localhost:3002/api/docs)
* **Health Check:** `GET http://localhost:3002/`
* **RabbitMQ Management Dashboard:** Access via your CloudAMQP instance overview.
