# 🛒 Enterprise Event-Driven E-Commerce Monorepo

A production-grade, event-driven microservices architecture built with **Turborepo**, **NestJS 12**, **Next.js 16**, **Angular 22**, **CloudAMQP (RabbitMQ)**, and **Supabase (PostgreSQL + S3 Storage)**.

---

## 🏛️ System Architecture

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
                      │  - Microservice Clients (CloudAMQP ClientProxies)       │
                      └─────────────┬──────────────────────────────┬────────────┘
                                    │                              │
          Direct Upload (PUT) 50MB  │                              │ Database Transactions
                                    ▼                              ▼
                 ┌──────────────────────────────────┐   ┌────────────────────────────────┐
                 │       SUPABASE S3 STORAGE        │   │      SUPABASE POSTGRESQL       │
                 │ - Bucket: TurboRepo              │   │ - Session Pooler (PgBouncer)   │
                 │ - Cloudflare Global CDN          │   │ - TypeORM Entities with UUIDs  │
                 │ - temp/ (Staging) -> avatars/    │   │ - Soft Deletion (deletedAt)    │
                 └──────────────────────────────────┘   └────────────────────────────────┘
                                    │
                                    │ Events & Commands
                                    ▼
             ┌──────────────────────────────────────────────────────────────┐
             │            CLOUDAMQP (RABBITMQ MESSAGE BROKER)               │
             │  Topic Exchange: 'ecommerce_exchange'                        │
             │  Dead Letter Exchange: 'ecommerce_dlx' (DLQ Policy Active)   │
             └──────────────┬────────────────┬─────────────────┬────────────┘
                            │                │                 │
     Routing: orders.*      │                │ billing.*       │ email.*
                            ▼                ▼                 ▼
             ┌────────────────────────┐ ┌────────────────────────┐ ┌───────────────────────────┐
             │  apps/orders-service   │ │ apps/billing-service   │ │    apps/email-service     │
             │  - Pure Microservice   │ │ - Pure Microservice    │ │ - Pure Microservice       │
             │  - Queue: orders_queue │ │ - Queue: billing_queue │ │ - Queue: email_queue      │
             │  - Order Lifecycle     │ │ - Invoice Generation   │ │ - Dead Letter: email_dlq  │
             │  - Emits Order Events  │ │ - Payment Ledger       │ │ - Prefetch: 5 & RateLimit │
             └────────────────────────┘ └────────────────────────┘ └───────────────────────────┘
```

---

## 📦 Monorepo Structure

### Applications (`apps/`)

| Application | Technology | Port / Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **`web-fe`** | **Next.js 16** (React 19, App Router) | `http://localhost:3000` | Customer storefront for browsing, cart, and checkout. |
| **`admin-fe`** | **Angular 22** (SSR, TailwindCSS v4) | `http://localhost:3001` | Seller and administrator management portal. |
| **`api-gateway`** | **NestJS 12** (ESM, TypeORM, Swagger) | `http://localhost:3002` | Public ingress, auth, file staging, and routing. |
| **`orders-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`orders_queue`) | Order state machine, inventory checks, order events. |
| **`billing-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`billing_queue`) | Invoicing, payment ledger, tax calculations. |
| **`email-service`** | **NestJS 12** (`@nestjs/microservices`) | CloudAMQP (`email_queue`) | Paced transactional email delivery with DLQ. |

### Shared Packages (`packages/`)

* **`@repo/common` (`packages/common`)**: Single source of truth for microservice event routing keys (`ORDER_EVENTS`, `EMAIL_EVENTS`, `BILLING_EVENTS`), RPC patterns (`ORDER_PATTERNS`), shared DTOs, and role definitions (`UserRole`).
* **`@repo/ui` (`packages/ui`)**: Shared reusable UI component library.
* **`@repo/typescript-config` (`packages/typescript-config`)**: Base `tsconfig.json` compiler presets.
* **`@repo/eslint-config` (`packages/eslint-config`)**: Shared linting configs.

---

## 🛡️ Production-Grade Core Features

### 1. Two-Phase File Pipeline (Supabase S3 + Cloudflare CDN)
* **Presigned S3 Uploads (`POST /api/upload/presigned-url`)**: Direct browser-to-S3 uploads for files up to **50MB** with zero API Gateway server RAM overhead.
* **Two-Phase Staging & Relocation**: Files upload to `temp/` and are promoted via server-side S3 copy (`CopyObjectCommand`) to permanent directories (`avatars/`, `products/`) upon form confirmation.
* **Automatic Storage Hygiene**: Previous user avatars are deleted automatically upon update to prevent orphaned asset storage fees.
* **Global Cloudflare CDN**: Public assets are cached and delivered through Cloudflare's global edge network.

### 2. Event-Driven Messaging (CloudAMQP)
* **Topic Exchange (`ecommerce_exchange`)**: Decoupled pub/sub messaging allowing multiple microservices to react to domain events concurrently.
* **Dead Letter Queue (`email_dlq`)**: Dynamic RabbitMQ policy (`email_dlx_policy`) routes malformed or rejected messages (`nack`) to a quarantine queue, preventing queue freezing.
* **Queue Flow Control**: Configured with `prefetchCount: 5` and manual acknowledgment (`noAck: false`).
* **Velocity Rate Limiting**: Built-in Nodemailer connection pool throttles outbound emails (5/sec) to prevent Google SMTP concurrency blocks (`421` / `454`).

### 3. Dual-Token Authentication & PostgreSQL Database
* **Short-Lived Access Tokens (15 min)**: Passed via Authorization header for stateless route guarding.
* **Secure Refresh Tokens (7 days)**: Managed via `httpOnly`, `Secure`, `SameSite=Strict` cookies.
* **Complete Auth Lifecycle**: 6-digit email OTP verification, password reset, account management, and Role-Based Access Control (`ADMIN`, `SELLER`, `BUYER`).
* **Supabase IPv4 Session Pooler**: Uses PgBouncer on port `5432`/`6543` to multiplex thousands of microservice connections.

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** `>= 22`
* **Yarn** `1.22.x`
* **CloudAMQP** (RabbitMQ cluster)
* **Supabase** (PostgreSQL + Storage)

### 2. Installation & Shared Package Build

```bash
# Install monorepo dependencies
yarn install

# Build shared contracts package
yarn workspace @repo/common build
```

---

## ⚙️ Environment Configuration

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

## 💻 Running the Services

### Run Entire Monorepo Simultaneously
```bash
yarn dev
```

### Run Backend Services Only
```bash
yarn turbo run dev --filter=api-gateway --filter=orders-service --filter=billing-service --filter=email-service
```

### Run Frontends Only
```bash
# Next.js Storefront (:3000)
yarn turbo run dev --filter=web-fe

# Angular Admin Portal (:3001)
yarn turbo run dev --filter=admin-fe
```

---

## 📑 Interactive Documentation & Health Checks

* **Swagger OpenAPI Docs:** [http://localhost:3002/api/docs](http://localhost:3002/api/docs)
* **Health Check:** `GET http://localhost:3002/`
* **RabbitMQ Management Dashboard:** Access via your CloudAMQP instance overview.
