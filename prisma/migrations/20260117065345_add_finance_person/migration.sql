/*
  Warnings:

  - You are about to drop the column `branch` on the `bank_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "branch",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "owner_name" TEXT;

-- AlterTable
ALTER TABLE "finance_transactions" ADD COLUMN     "person_phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed';

-- CreateTable
CREATE TABLE "finance_persons" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "finance_persons_pkey" PRIMARY KEY ("id")
);
