/*
  Warnings:

  - You are about to drop the column `allowances` on the `payslips` table. All the data in the column will be lost.
  - You are about to drop the column `bonuses` on the `payslips` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `payslips` table. All the data in the column will be lost.
  - You are about to drop the column `overtime_hours` on the `payslips` table. All the data in the column will be lost.
  - You are about to drop the column `overtime_pay` on the `payslips` table. All the data in the column will be lost.
  - You are about to drop the column `allowances` on the `staff_salary_settings` table. All the data in the column will be lost.
  - You are about to drop the column `effective_from` on the `staff_salary_settings` table. All the data in the column will be lost.
  - You are about to drop the column `effective_to` on the `staff_salary_settings` table. All the data in the column will be lost.
  - You are about to drop the column `overtime_rate` on the `staff_salary_settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[staff_id]` on the table `staff_salary_settings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `check_in_time` to the `shifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `check_out_time` to the `shifts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payslips" DROP COLUMN "allowances",
DROP COLUMN "bonuses",
DROP COLUMN "deductions",
DROP COLUMN "overtime_hours",
DROP COLUMN "overtime_pay",
ADD COLUMN     "bonus" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "paid_amount" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "penalty" DECIMAL(15,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "check_in_time" TIME NOT NULL,
ADD COLUMN     "check_out_time" TIME NOT NULL;

-- AlterTable
ALTER TABLE "staff_salary_settings" DROP COLUMN "allowances",
DROP COLUMN "effective_from",
DROP COLUMN "effective_to",
DROP COLUMN "overtime_rate";

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" SERIAL NOT NULL,
    "payslip_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,4) NOT NULL,
    "method" TEXT NOT NULL,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "note" TEXT,
    "finance_transaction_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_salary_settings_staff_id_key" ON "staff_salary_settings"("staff_id");

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_payslip_id_fkey" FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_finance_transaction_id_fkey" FOREIGN KEY ("finance_transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
