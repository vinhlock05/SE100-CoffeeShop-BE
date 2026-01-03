# =========================
# 1️⃣ Base Stage
# =========================
FROM node:22-slim AS base
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g nodemon

# =========================
# 2️⃣ Dependencies Stage
# =========================
FROM base AS dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# =========================
# 3️⃣ Development Stage
# =========================
FROM dependencies AS development
COPY . .
CMD ["nodemon", "src/index.ts"]

# =========================
# 4️⃣ Builder Stage
# =========================
FROM dependencies AS builder
COPY . .
RUN npm run build
RUN npm prune --production

# =========================
# 5️⃣ Production Stage
# =========================
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Generate Prisma client for production
RUN npx prisma generate

EXPOSE 4000
CMD ["node", "dist/index.js"]
