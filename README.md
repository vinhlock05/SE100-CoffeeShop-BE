# SE100-CoffeeShop-BE

Backend API for Coffee Shop Management System built with Express + TypeScript + Prisma + PostgreSQL.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
SE100-CoffeeShop-BE/
├── prisma/
│   └── schema.prisma     # Database schema
├── src/
│   ├── config/           # App configuration
│   ├── controllers/      # Route handlers
│   ├── core/             # Core utilities (responses)
│   ├── dtos/             # Data Transfer Objects
│   ├── middlewares/      # Express middlewares
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── app.ts            # Express app setup
│   └── index.ts          # Entry point
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
└── nodemon.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file and configure:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database credentials:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/coffeeshop?schema=public"
   ```

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Run database migrations:
   ```bash
   npm run db:migrate
   ```

### Development

```bash
npm run dev
```

Server will start at `http://localhost:4000`

### Development with Docker

Start all services (PostgreSQL + Backend):
```bash
docker compose up
```

Run in background:
```bash
docker compose up -d
```

Rebuild images (sau khi thay đổi `Dockerfile`, `package.json`, hoặc `prisma/schema.prisma`):
```bash
docker compose up -d --build
```

Stop services:
```bash
docker compose down
```

Run database migrations inside container:
```bash
docker compose exec backend npx prisma migrate dev
```

### Build for Production

```bash
npm run build
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:studio` | Open Prisma Studio |

## API Endpoints

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

*More endpoints will be documented as they are implemented.*

## Database Schema

The database schema includes 50 tables organized into 10 modules:

1. **Users & Auth**: `users`, `roles`, `permissions`, `role_permissions`
2. **Inventory**: `categories`, `units`, `item_types`, `inventory_items`, `inventory_batches`, `item_ingredients`, `item_toppings`
3. **Customers**: `customer_groups`, `customers`
4. **Sales**: `table_areas`, `tables`, `orders`, `order_items`
5. **Promotions**: `promotion_types`, `promotions`, `combos`, `combo_items`, and applicable relations
6. **Purchasing**: `suppliers`, `purchase_orders`, `purchase_order_items`
7. **Staff**: `staff`, `staff_salary_settings`, `shifts`, `staff_schedules`, `timekeeping`, `payroll`, `payslips`
8. **Finance**: `finance_types`, `finance_categories`, `bank_accounts`, `finance_transactions`
9. **Stock**: `stock_checks`, `stock_check_items`, `write_offs`, `write_off_items`, `new_item_requests`
10. **System**: `activity_logs`, `system_settings`

## License

ISC
