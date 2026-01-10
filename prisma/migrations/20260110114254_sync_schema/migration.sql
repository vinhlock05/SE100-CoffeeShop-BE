/*
  Warnings:

  - You are about to drop the column `discount_amount` on the `purchase_order_items` table. All the data in the column will be lost.
  - You are about to drop the column `discount_percent` on the `purchase_order_items` table. All the data in the column will be lost.
  - You are about to drop the column `actual_delivery` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `discount_amount` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `expected_delivery` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `tax_amount` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `tax_code` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `approved_by` on the `write_offs` table. All the data in the column will be lost.
  - You are about to drop the `new_item_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "new_item_requests" DROP CONSTRAINT "new_item_requests_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "new_item_requests" DROP CONSTRAINT "new_item_requests_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "write_offs" DROP CONSTRAINT "write_offs_approved_by_fkey";

-- AlterTable
ALTER TABLE "purchase_order_items" DROP COLUMN "discount_amount",
DROP COLUMN "discount_percent";

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "actual_delivery",
DROP COLUMN "discount_amount",
DROP COLUMN "expected_delivery",
DROP COLUMN "subtotal",
DROP COLUMN "tax_amount",
ADD COLUMN     "bank_account" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "payment_method" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "notes",
DROP COLUMN "tax_code",
ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "write_off_items" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "write_offs" DROP COLUMN "approved_by";

-- DropTable
DROP TABLE "new_item_requests";
