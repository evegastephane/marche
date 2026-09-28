/*
  Warnings:

  - Added the required column `currency` to the `special_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN     "custom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "special_requests" ADD COLUMN     "currency" CHAR(3) NOT NULL;

-- CreateIndex
CREATE INDEX "products_title_trgm" ON "products" USING GIN ("title" gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- SQL manuel : ce que le schéma Prisma ne sait pas exprimer
-- ─────────────────────────────────────────────────────────────

-- R12 : la remise des packs ne dépasse jamais le sous-total et n'est jamais négative
ALTER TABLE "orders" ADD CONSTRAINT "discount_within_subtotal"
  CHECK ("discount_amount" >= 0 AND "discount_amount" <= "subtotal_amount");

-- Une remise de pack en pourcentage reste entre 1 et 90 %
ALTER TABLE "bundles" ADD CONSTRAINT "bundle_discount_valid"
  CHECK ("discount_value" >= 1 AND ("discount_type" <> 'PERCENT' OR "discount_value" <= 90));
