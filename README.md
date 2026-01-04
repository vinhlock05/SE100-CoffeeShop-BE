# SE100-CoffeeShop-BE

Backend API for Coffee Shop Management System built with Express + TypeScript + Prisma + PostgreSQL.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher (if running locally without Docker)
- Docker Desktop (if using Docker)

---

### 🐳 Option 1: Development with Docker (Recommended)

#### 1. Initial Setup (Clone & Run)
Khi mới clone project về, làm theo các bước sau:

**Bước 1: Cấu hình môi trường**
```bash
cp .env.example .env
```
_Lưu ý: Trong `.env`, đảm bảo `DATABASE_URL` trỏ tới service `postgres`:_
```ini
DATABASE_URL="postgresql://coffeeshop:coffeeshop@postgres:5432/coffeeshop?schema=public"
```

**Bước 2: Khởi chạy Containers**
```bash
docker compose up -d --build
```
- `-d`: Chạy ngầm (detached mode)
- `--build`: Build lại image (cần thiết khi lần đầu chạy hoặc khi sửa `package.json`/`Dockerfile`)

**Bước 3: Khởi tạo Database**
```bash
# Chạy migration để tạo tables
docker compose exec backend npx prisma migrate dev

# (Tùy chọn) Seed dữ liệu mẫu
docker compose exec backend npx prisma db seed
```

#### 2. Daily Workflow
**Start Server:**
```bash
docker compose up -d
```
API sẽ chạy tại: `http://localhost:4000`

**Xem Logs (Debug):**
```bash
# Xem logs realtime của backend
docker compose logs -f backend

# Xem logs của database
docker compose logs -f postgres
```

**Stop Server:**
```bash
docker compose down
```

**Khi thay đổi Database Schema (`prisma/schema.prisma`):**
1. Sửa file `prisma/schema.prisma`
2. Chạy lệnh tạo migration:
```bash
   docker compose exec backend npx prisma migrate dev --name <ten_thay_doi>
   # Ví dụ: docker compose exec backend npx prisma migrate dev --name add_user_phone
```
_Lệnh này sẽ tự động generate lại Prisma Client._

**Khi cài thêm thư viện (`npm install`):**
1. Chạy lệnh install trong container:
```bash
   docker compose exec backend npm install <package_name>
```
2. Rebuild lại container để đảm bảo môi trường đồng bộ:
```bash
   docker compose up -d --build
```

**Các lệnh Database hữu ích:**
- **Xem dữ liệu trực quan (GUI):**
  ```bash
  # Yêu cầu: đã map port 5555 trong docker-compose.yml
  docker compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0 --no-browser
  ```
  _Mở trình duyệt tại http://localhost:5555_

- **Push thẳng Schema (không tạo migration history):**
  ```bash
  docker compose exec backend npx prisma db push
  ```

- **Xóa trắng và tạo lại Database (Reset):**
  ```bash
  docker compose exec backend npx prisma migrate reset
  ```

---

### 💻 Option 2: Local Development (Without Docker)

#### 1. Initial Setup

**Bước 0: Cài đặt PostgreSQL (Windows)**
> *Bỏ qua nếu bạn đã cài PostgreSQL.*

1. Tải bộ cài đặt từ [PostgreSQL Official Website](https://www.postgresql.org/download/windows/).
2. Chạy file installer:
   - Giữ nguyên các tùy chọn mặc định (Port 5432).
   - **Quan trọng:** Ghi nhớ mật khẩu bạn đặt cho user `postgres` (Superuser password).
3. Tạo database `coffeeshop`:
   - **Cách 1: Dùng pgAdmin 4** (cài sẵn):
     - Chuột phải vào **Databases** > **Create** > **Database...** > Nhập `coffeeshop`.
   - **Cách 2: Dùng Command Prompt (CMD)**:
     ```cmd
     "C:\Program Files\PostgreSQL\16\bin\psql" -U postgres
     postgres=# CREATE DATABASE coffeeshop;
     postgres=# \q
     ```

**Bước 1: Cấu hình môi trường**
```bash
cp .env.example .env
```
_Lưu ý: Trong `.env`, `DATABASE_URL` trỏ tới database local của bạn:_
```ini
DATABASE_URL="postgresql://postgres:password@localhost:5432/coffeeshop?schema=public"
```

**Bước 2: Cài đặt Dependencies**
```bash
npm install
```

**Bước 3: Khởi tạo Database**
Đảm bảo PostgreSQL đã chạy và database `coffeeshop` đã được tạo.
```bash
# Tạo tables
npx prisma migrate dev

# (Tùy chọn) Seed dữ liệu
npx prisma db seed
```

#### 2. Daily Workflow
**Start Server:**
```bash
npm run dev
```

**Khi thay đổi Database Schema:**
```bash
npx prisma migrate dev --name <ten_thay_doi>
```

**Các lệnh Database hữu ích:**
- **Xem dữ liệu trực quan (GUI):**
```bash
npx prisma studio
```
_Tự động mở trình duyệt tại http://localhost:5555_

- **Push thẳng Schema (không tạo migration history):**
>Dùng khi đang prototype nhanh, cẩn thận mất dữ liệu.
```bash
npx prisma db push
```

- **Xóa trắng và tạo lại Database (Reset):**
>Lệnh này sẽ xóa toàn bộ dữ liệu, chạy lại migration từ đầu và seed lại dữ liệu.
```bash
npx prisma migrate reset
```

---

## Project Structure

```
SE100-CoffeeShop-BE/
├── prisma/
│   └── schema.prisma     # Database schema (50 tables)
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
├── docker-compose.yml    # Docker services config
├── Dockerfile            # Backend Docker image config
├── package.json
└── tsconfig.json
```

## Available Scripts

Các lệnh dưới đây được cấu hình trong `package.json`.
- **Local:** Chạy trực tiếp (ví dụ: `npm run db:migrate`)
- **Docker:** Chạy thông qua container: `docker compose exec backend npm run <script>`

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:studio` | Open Prisma Studio (Database GUI) |

## API Endpoints

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

## License

ISC
