/*
  Warnings:

  - You are about to drop the column `end_date` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `usage_count` on the `promotions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[priority]` on the table `customer_groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "end_date",
DROP COLUMN "end_time",
DROP COLUMN "start_date",
DROP COLUMN "start_time",
DROP COLUMN "usage_count",
ADD COLUMN     "buy_quantity" INTEGER,
ADD COLUMN     "current_total_usage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "end_datetime" TIMESTAMP(3),
ADD COLUMN     "get_quantity" INTEGER,
ADD COLUMN     "max_total_usage" INTEGER,
ADD COLUMN     "max_usage_per_customer" INTEGER,
ADD COLUMN     "product_scope_type" TEXT,
ADD COLUMN     "start_datetime" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "promotion_gift_items" (
    "promotion_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,

    CONSTRAINT "promotion_gift_items_pkey" PRIMARY KEY ("promotion_id","item_id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" SERIAL NOT NULL,
    "promotion_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotion_usages_promotion_id_customer_id_idx" ON "promotion_usages"("promotion_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_priority_key" ON "customer_groups"("priority");

-- AddForeignKey
ALTER TABLE "promotion_gift_items" ADD CONSTRAINT "promotion_gift_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_gift_items" ADD CONSTRAINT "promotion_gift_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "require_same_item" BOOLEAN DEFAULT false;
ALTER TABLE "promotions" ADD COLUMN     "description" TEXT;