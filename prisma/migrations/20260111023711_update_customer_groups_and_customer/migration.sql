/*
  Warnings:

  - You are about to drop the column `discount_percent` on the `customer_groups` table. All the data in the column will be lost.
  - You are about to drop the column `min_points` on the `customer_groups` table. All the data in the column will be lost.
  - You are about to drop the column `loyalty_points` on the `customers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `customer_groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customer_groups" DROP COLUMN "discount_percent",
DROP COLUMN "min_points",
ADD COLUMN     "min_orders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "min_spend" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "window_months" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "loyalty_points";

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_name_key" ON "customer_groups"("name");

/*
  Warnings:

  - The `status` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "status",
ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'active';

/*
  Warnings:

  - You are about to drop the column `status` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "status",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- DropEnum
DROP TYPE "CustomerStatus";

/*
  Warnings:

  - You are about to drop the column `email` on the `customers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_id` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_group_id_fkey";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "email",
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "group_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
