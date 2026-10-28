# Family Bakery Web

Enterprise web application for multi-branch bakery supply chain, inventory tracking, central kitchen production scheduling, and custom pre-order fulfillment.

---

## Overview

Family Bakery Web provides end-to-end management for distributed bakery operations. The system bridges retail store branches with the central baking kitchen by synchronizing custom customer pre-orders, branch restock requests, point-of-sale inventory transactions, and automated baking schedules.

---

## System Architecture

```mermaid
graph TD
    subgraph Client Layer
        AdminUI[Super Admin Dashboard]
        StoreUI[Branch Store POS & Inventory]
        KitchenUI[Central Kitchen Baking Sheet]
    end

    subgraph Application Server
        NextJS[Next.js 16 App Router]
        AuthMiddleware[JWT Session & RBAC Guard]
        ServerActions[Server Actions API Layer]
        CustomUI[Tailwind CSS Design System]
    end

    subgraph External Services
        TelegramService[Telegram Bot Webhook]
        MLService[FastAPI Demand Forecasting Service]
    end

    subgraph Data Layer
        Prisma[Prisma ORM 6]
        Postgres[(Supabase PostgreSQL)]
        Storage[Supabase Object Storage]
    end

    Client Layer --> NextJS
    NextJS --> AuthMiddleware
    AuthMiddleware --> ServerActions
    ServerActions --> Prisma
    Prisma --> Postgres
    ServerActions -.-> TelegramService
    ServerActions -.-> MLService
    NextJS -.-> Storage
```

---

## Operational Workflows

```mermaid
sequenceDiagram
    autonumber
    actor Branch as Branch Staff
    actor Admin as Super Admin
    actor Kitchen as Central Kitchen
    actor Customer as Customer

    Note over Customer,Kitchen: Custom Order Fulfillment
    Customer->>Branch: Place custom order (Target date, bread variants, deposit)
    Branch->>Kitchen: Submit order (Aggregated into daily baking schedule)
    Kitchen->>Kitchen: Bake allocated volume & update status
    Kitchen->>Customer: Order ready for pickup at selected branch

    Note over Branch,Admin: Multi-Item Restock Approval
    Branch->>Admin: Submit batch restock request (REQ-YYYYMMDD-XXXX)
    Admin-->>Admin: Receive instant Telegram notification
    alt Approved
        Admin->>Branch: Approve batch (Atomic transaction increments branch stock)
    else Rejected
        Admin->>Branch: Reject request with feedback note
    end
```

---

## Core Capabilities

### Central Kitchen Baking Schedule
- Automated Daily Aggregation: Computes exact production targets by consolidating scheduled customer pre-orders with branch replenishment orders.
- Interactive Production Checklist: Real-time visual tracking for kitchen bakers across oven batches.
- Print-Optimized Worksheets: Dedicated kitchen print layout formatted for standard receipts and kitchen clipboards.
- Status Lifecycle Management: Real-time transition tracking through PENDING, IN_PROCESS, READY, COMPLETED, and CANCELLED states.

### Branch Restock Approval Workflow
- Batch Submissions: Branch operators group multiple bread variants into a single traceable requisition batch (`REQ-YYYYMMDD-XXXX`).
- Instant Push Alerts: Automated Telegram bot notifications sent directly to administrator channels upon request submission and approval.
- Transactional Consistency: Stock replenishment executed via atomic PostgreSQL transactions to prevent inventory drift.
- Audit Trail: Immutable logging of requester identity, approver credentials, timestamps, and item quantities.

### Point of Sale & Inventory Tracking
- Multi-Store Isolation: Independent stock levels, price overrides, and low-inventory warning thresholds per branch.
- POS Checkout: Instant decrement of store inventory upon sale confirmation.
- Payment Verification: Storage and verification workflows for digital payment receipts.

### Analytics & Forecasting
- Recharts Dashboard: Interactive gross revenue, profit margins, and branch comparative charts with zero layout-shift guards.
- Demand Forecasting: Integration points for predictive machine learning models to forecast upcoming bread demand.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server Actions) |
| Runtime & Language | Node.js, TypeScript |
| UI & Styling | React 19, Tailwind CSS v4, Lucide React |
| Charts & Visualization | Recharts |
| Database & ORM | PostgreSQL (Supabase), Prisma ORM 6 |
| Authentication | Encrypted JWT HTTP-only cookies (jose), bcrypt |
| External Integration | Telegram Bot API, ExcelJS |

---

## Project Structure

```text
├── app/
│   ├── (dashboard)/
│   │   ├── audit/              # Activity and security audit logs
│   │   ├── forecast/           # Sales analytics and demand projection
│   │   ├── orders/             # Central kitchen schedule & customer orders
│   │   ├── products/           # Master catalog management
│   │   ├── reports/            # Sales reporting and XLSX export
│   │   └── stores/             # Branch inventory & restock operations
│   ├── api/                    # File uploads, report streaming, alerts
│   └── login/                  # User authentication
├── components/                 # Reusable UI components
│   ├── BakingScheduleClient.tsx# Kitchen schedule and pre-order management
│   ├── CreateOrderModal.tsx    # Order creation modal with product search
│   ├── CustomDropdown.tsx      # Headless custom popover dropdown system
│   ├── RestockForm.tsx         # Multi-item batch restock submission form
│   ├── PendingRestockList.tsx  # Administrator restock approval review panel
│   └── SalesChart.tsx          # Responsive revenue and sales charts
├── lib/
│   ├── actions/                # Next.js Server Actions
│   ├── audit.ts                # Audit logging engine
│   ├── db.ts                   # Prisma client singleton
│   ├── session.ts              # JWT session encryption and verification
│   └── telegram.ts             # Telegram webhook dispatcher
├── prisma/
│   └── schema.prisma           # Database schema and B-tree indexes
└── scripts/                    # Database migrations and test seeders
```

---

## Local Development Setup

### Prerequisites
- Node.js 18.18 or higher (Node 20+ recommended)
- PostgreSQL database instance (local or Supabase)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Ferdyagustian/FE-Family-Bakery-Stok-WEB.git
   cd FE-Family-Bakery-Stok-WEB
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
   DIRECT_URL="postgresql://user:password@host:port/database"
   JWT_SECRET="generate-a-secure-random-32-byte-string"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   TELEGRAM_BOT_TOKEN="your-bot-token"
   TELEGRAM_CHAT_ID="your-chat-id"
   ```

4. Push database schema:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Security Specifications

- Environment Isolation: `.env` and local secrets are excluded via `.gitignore`.
- Role-Based Access Control: Granular role separation (`ADMIN` vs `STORE_USER`) enforced at middleware, API route, and database action layers.
- Row-Level Security: PostgreSQL database security policies preventing cross-branch unauthorized access.
- Audit Trail: Immutable event logging for critical state mutations (logins, stock adjustments, order modifications).

---

## License

Proprietary software. All rights reserved by Family Bakery.
