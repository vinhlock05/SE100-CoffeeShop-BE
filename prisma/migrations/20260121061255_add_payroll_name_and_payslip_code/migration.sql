/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `payslips` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `payslips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payroll" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payslips_code_key" ON "payslips"("code");
