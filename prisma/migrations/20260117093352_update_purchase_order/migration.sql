/*
  Warnings:

  - You are about to drop the column `balance` on the `bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `bank_account` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `purchase_orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[finance_transaction_id]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "balance";

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "bank_account",
DROP COLUMN "bank_name",
ADD COLUMN     "finance_transaction_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_finance_transaction_id_key" ON "purchase_orders"("finance_transaction_id");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_finance_transaction_id_fkey" FOREIGN KEY ("finance_transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
