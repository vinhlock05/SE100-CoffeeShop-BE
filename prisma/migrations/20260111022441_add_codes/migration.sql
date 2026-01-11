/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `customer_groups` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `promotions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `customer_groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `inventory_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customer_groups" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_code_key" ON "customer_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_code_key" ON "inventory_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
