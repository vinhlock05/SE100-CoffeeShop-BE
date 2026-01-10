/*
  Warnings:

  - You are about to drop the column `table_number` on the `tables` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[table_name]` on the table `tables` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `table_name` to the `tables` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tables" DROP COLUMN "table_number",
ADD COLUMN     "table_name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tables_table_name_key" ON "tables"("table_name");

/*
  Warnings:

  - You are about to drop the column `status` on the `tables` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tables" DROP COLUMN "status",
ADD COLUMN     "current_status" TEXT NOT NULL DEFAULT 'available',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

/*
  Warnings:

  - The `current_status` column on the `tables` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('available', 'occupied');

-- AlterTable
ALTER TABLE "tables" DROP COLUMN "current_status",
ADD COLUMN     "current_status" "TableStatus" NOT NULL DEFAULT 'available';

