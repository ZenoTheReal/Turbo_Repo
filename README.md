# Full-Stack Microservices Monorepo

A production-grade, event-driven microservices architecture built with **Turborepo**, **NestJS**, **Next.js**, **Angular**, and **PostgreSQL (Supabase)**.

---

## 🏛️ Architecture Overview

```
                      ┌─────────────────────────┐     ┌─────────────────────────┐
                      │    apps/web-fe (:3000)  │     │   apps/admin-fe (:3001) │
                      │   Next.js 16 Storefront │     │    Angular 22 Dashboard │
                      └────────────┬────────────┘     └────────────┬────────────┘
                                   │                               │
                                   │ HTTP (REST / JSON)            │ HTTP (REST / JSON)
                                   ▼                               ▼
                      ┌─────────────────────────────────────────────────────────┐
                      │                 apps/api-gateway (:3002)                │
                      │  - Public Ingress & Authentication (JWT, RBAC)          │
                      │  - Interactive Swagger Docs: /api/docs                  │
                      │  - Request Validation & Routing                         │
                      └────────────────┬───────────────────────┬────────────────┘
                                       │                       │
                    Pattern 1: RPC     │ TCP: Port 3003        │ Pattern 2: Events
                    (Request-Response) │ orders.findAll        │ (Fire & Forget)
                                       ▼                       ▼
                      ┌────────────────────────┐      ┌─────────────────────────┐
                      │  apps/orders-service   │      │  apps/billing-service   │
                      │  - Pure Microservice   │      │  - Pure Microservice    │
                      │  - Internal TCP :3003  │      │  - Internal TCP :3004   │
                      └────────────┬───────────┘      └────────────┬────────────┘
                                   │                               │
                                   ▼                               ▼
                      [(       Supabase PostgreSQL (Session Pooler)            )]
```

---

## 📦 What's Inside?

### Applications (`apps/`)

| Application | Framework / Technology | Port / Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **`web-fe`** | **Next.js 16** (App Router, React 19) | `http://localhost:3000` | Customer-facing e-commerce storefront. |
| **`admin-fe`** | **Angular 22** (SSR, TailwindCSS v4) | `http://localhost:3001` | Back-office management portal for sellers & admins. |
| **`api-gateway`** | **NestJS 12** (ESM, TypeORM, Swagger) | `http://localhost:3002` | Public API Gateway. Handles auth, users table, and delegates commands. |
| **`orders-service`** | **NestJS 12** (`@nestjs/microservices`) | TCP `127.0.0.1:3003` | Internal microservice managing order lifecycles and transactions. |
| **`billing-service`** | **NestJS 12** (`@nestjs/microservices`) | TCP `127.0.0.1:3004` | Internal microservice reacting to order events to generate invoices. |

### Shared Packages (`packages/`)

* **`@repo/common` (`packages/common`)**: Single source of truth for shared TypeScript enums (`UserRole`), message patterns (`ORDER_PATTERNS`), and events (`ORDER_EVENTS`).
* **`@repo/ui` (`packages/ui`)**: Shared React component library.
* **`@repo/typescript-config` (`packages/typescript-config`)**: Shared `tsconfig.json` presets.
* **`@repo/eslint-config` (`packages/eslint-config`)**: Shared ESLint rules.

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** `>= 22`
* **Yarn** `1.21.1` (or modern Yarn via Corepack)
* **Supabase PostgreSQL** account

### 2. Installation & Building Shared Packages

```bash
# 1. Install all dependencies across the monorepo
yarn install

# 2. Build the shared @repo/common package (generates dist/)
yarn workspace @repo/common build
```

---

## 💻 Running the Services

### Run All Backend Services (Gateway + Microservices)
```bash
yarn turbo run dev --filter=api-gateway --filter=orders-service --filter=billing-service
```

### Run Frontends
```bash
# Run Next.js Customer Storefront (:3000)
yarn turbo run dev --filter=web-fe

# Run Angular Admin Dashboard (:3001)
yarn turbo run dev --filter=admin-fe
```

### Run Everything Simultaneously
```bash
yarn dev
```

---

## 📑 API & Documentation

* **Swagger UI:** Accessible at [http://localhost:3002/api/docs](http://localhost:3002/api/docs) when `api-gateway` is running.
* **Health Check:** `GET http://localhost:3002/`

---

## 📡 Microservice Communication Patterns

1. **Request-Response (RPC via TCP):**
   * Gateway sends `orders.findAll` via `client.send()`.
   * `orders-service` responds synchronously with the order list.
2. **Event-Driven (Pub/Sub via TCP):**
   * When an order is placed, `orders-service` emits `orders.event.created` via `client.emit()`.
   * `billing-service` listens via `@EventPattern()` and processes invoicing asynchronously.
