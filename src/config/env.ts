import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server settings
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database URL (Prisma)
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/coffeeshop?schema=public",

  // JWT settings
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",

  // Cloudinary settings (optional)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",

  // URLs
  BASE_URL: process.env.BASE_URL || "http://localhost:4000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
};
