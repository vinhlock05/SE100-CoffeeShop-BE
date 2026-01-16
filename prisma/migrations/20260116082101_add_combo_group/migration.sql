/*
  Warnings:

  - You are about to drop the column `combo_id` on the `combo_items` table. All the data in the column will be lost.
  - You are about to drop the column `group_name` on the `combo_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_required` on the `combo_items` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `combo_items` table. All the data in the column will be lost.
  - Added the required column `combo_group_id` to the `combo_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "combo_items" DROP CONSTRAINT "combo_items_combo_id_fkey";

-- AlterTable
ALTER TABLE "combo_items" DROP COLUMN "combo_id",
DROP COLUMN "group_name",
DROP COLUMN "is_required",
DROP COLUMN "quantity",
ADD COLUMN     "combo_group_id" INTEGER NOT NULL,
ADD COLUMN     "extra_price" DECIMAL(15,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "combo_groups" (
    "id" SERIAL NOT NULL,
    "combo_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "min_choices" INTEGER NOT NULL DEFAULT 1,
    "max_choices" INTEGER NOT NULL DEFAULT 1,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "combo_groups" ADD CONSTRAINT "combo_groups_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_group_id_fkey" FOREIGN KEY ("combo_group_id") REFERENCES "combo_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
