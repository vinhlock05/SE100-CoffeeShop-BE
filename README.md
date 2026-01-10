# SE100-CoffeeShop-BE

Backend API for Coffee Shop Management System.

---

## 🚀 HƯỚNG DẪN CHO FRONTEND DEVELOPERS

### Yêu cầu cài đặt
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- Hoặc **Node.js 18+** và **PostgreSQL 15+** (nếu không dùng Docker)

---

## 🐳 Cách 1: Dùng Docker (Đơn giản nhất)

### Lần đầu tiên chạy dự án

```bash
# 1. Clone project
git clone https://github.com/vinhlock05/SE100-CoffeeShop-BE.git
cd SE100-CoffeeShop-BE

# 2. Tạo file cấu hình
cp .env.example .env

# 3. Khởi động server + database
docker compose up -d --build

# 4. Tạo database và dữ liệu mẫu (LẦN ĐẦU TIÊN)
docker compose exec backend npx prisma migrate dev
```

✅ **Done!** API chạy tại: `http://localhost:4000/api`

### Các lệnh hàng ngày

| Mục đích | Lệnh |
|----------|------|
| 🟢 Bật server | `docker compose up -d` |
| 🔴 Tắt server | `docker compose down` |
| 📋 Xem logs | `docker compose logs -f backend` |
| 🔄 Update database | `docker compose exec backend npx prisma migrate dev` |

### ⚠️ Khi pull code mới về

Nếu có thay đổi database schema (file `prisma/schema.prisma`):

```bash
docker compose down
docker compose up -d --build
docker compose exec backend npx prisma migrate dev
```

> **Lưu ý:** Lệnh `migrate dev` sẽ **giữ nguyên data** và chỉ apply migration mới.
> Nếu bị lỗi conflict, hãy hỏi team backend trước khi dùng `migrate reset`.

---

## 💻 Cách 2: Chạy Local (Không dùng Docker)

### Bước 1: Cài PostgreSQL

**Windows:**
1. Tải từ [postgresql.org](https://www.postgresql.org/download/windows/)
2. Cài đặt với password cho user `postgres` (nhớ password này!)
3. Tạo database `coffeeshop`:
   ```cmd
   "C:\Program Files\PostgreSQL\16\bin\psql" -U postgres
   postgres=# CREATE DATABASE coffeeshop;
   postgres=# \q
   ```

**MacOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb coffeeshop
```

**Linux (Ubuntu):**
```bash
sudo apt install postgresql
sudo -u postgres createdb coffeeshop
```

### Bước 2: Cấu hình và chạy

```bash
# 1. Clone project
git clone https://github.com/vinhlock05/SE100-CoffeeShop-BE.git
cd SE100-CoffeeShop-BE

# 2. Tạo file cấu hình
cp .env.example .env

# 3. Sửa DATABASE_URL trong .env (thay YOUR_PASSWORD bằng password postgres của bạn)
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/coffeeshop?schema=public"

# 4. Cài dependencies
npm install

# 5. Tạo database và seed (LẦN ĐẦU TIÊN)
npx prisma migrate dev

# 6. Chạy server
npm run dev
```

✅ **Done!** API chạy tại: `http://localhost:4000/api`

### Các lệnh hàng ngày

| Mục đích | Lệnh |
|----------|------|
| 🟢 Bật server | `npm run dev` |
| Đồng bộ database | `npx prisma migrate dev` |
| 🔍 Xem database (GUI) | `npx prisma studio` |

---

## 🔑 Tài khoản mặc định

| Username | Password | Vai trò |
|----------|----------|---------|
| `admin` | `123456` | Quản trị viên |
| `manager` | `123456` | Quản lý |
| `staff` | `123456` | Nhân viên |
| `cashier` | `123456` | Thu ngân |

---

## 📡 API Endpoint

Base URL: `http://localhost:4000/api`

### Authentication
```
POST /auth/login
Body: { "username": "admin", "password": "123456" }
```

Response sẽ trả về `accessToken` để dùng cho các API khác:
```
Authorization: Bearer <accessToken>
```

---

## ❓ Xử lý lỗi thường gặp

### 1. "Port 4000 already in use"
```bash
# Docker
docker compose down
docker compose up -d

# Local (tìm và kill process dùng port 4000)
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :4000
kill -9 <PID>
```

### 2. "Database connection refused"
- **Docker**: Đảm bảo container postgres đang chạy: `docker compose ps`
- **Local**: Đảm bảo PostgreSQL đang chạy và password đúng trong `.env`

### 3. "Prisma Client Error" hoặc migration lỗi
```bash
# Docker
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate dev

# Local
npx prisma generate
npx prisma migrate dev
```

### 4. Lỗi khi pull code mới
```bash
# Docker
docker compose down
docker compose up -d --build
docker compose exec backend npx prisma migrate dev

# Local
npm install
npx prisma migrate dev
npm run dev
```

### 5. Cần reset database về trạng thái ban đầu (⚠️ MẤT DATA)
> **Cảnh báo:** Chỉ dùng khi THẬT SỰ cần thiết, lệnh này sẽ XÓA TOÀN BỘ dữ liệu!
```bash
# Docker
docker compose exec backend npx prisma migrate reset --force

# Local
npx prisma migrate reset --force
```

---

## 📁 Cấu trúc thư mục

```
SE100-CoffeeShop-BE/
├── prisma/
│   └── schema.prisma     # Database schema
├── src/
│   ├── controllers/      # API handlers
│   ├── services/         # Business logic
│   ├── routes/           # API routes
│   ├── dtos/             # Data validation
│   └── middlewares/      # Auth, validation
├── docs/                 # API documentation
├── postman/              # Postman collections
├── .env.example          # Environment template
├── docker-compose.yml    # Docker config
└── package.json
```

---

## 📖 Tài liệu API

- [Inventory Management API](./docs/inventory-api.md) - Quản lý kho, nhà cung cấp, nhập/xuất hàng

---

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express 5.x
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT

## License

ISC
