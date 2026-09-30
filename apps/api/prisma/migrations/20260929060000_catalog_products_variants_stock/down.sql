-- Retour arrière de la migration catalog_products_variants_stock (docs/PLAN-CODE.md §5.1) :
--   npx prisma db execute --file prisma/migrations/20260929060000_catalog_products_variants_stock/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)
-- Perdus : unités IMEI, specs, options JSON des variantes, catégorie des produits. Les mouvements
-- « Reprise du journal » restent (ils sont cohérents avec inventory_levels).

-- Journal du stock : déclencheurs, fonctions et vue
DROP TRIGGER IF EXISTS "stock_movements_immutable" ON "stock_movements";
DROP TRIGGER IF EXISTS "inventory_levels_on_hand_guard" ON "inventory_levels";
DROP TRIGGER IF EXISTS "stock_movements_apply" ON "stock_movements";
DROP FUNCTION IF EXISTS "stock_movement_immutable"();
DROP FUNCTION IF EXISTS "inventory_on_hand_guard"();
DROP FUNCTION IF EXISTS "stock_movement_apply"();
DROP VIEW IF EXISTS "variant_stock";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_image_media_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_stock_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_units" DROP CONSTRAINT "stock_units_variant_id_fkey";

-- DropIndex
DROP INDEX "products_store_id_category_id_status_idx";

-- DropIndex
DROP INDEX "products_specs_gin";

-- DropIndex
DROP INDEX "products_store_id_reference_key";

-- DropIndex
DROP INDEX "product_variants_store_id_barcode_idx";

-- DropIndex
DROP INDEX "product_variants_options_gin";

-- DropIndex
DROP INDEX "product_variants_product_id_combination_key_key";

-- DropIndex
DROP INDEX "stock_movements_stock_unit_id_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "category_id",
DROP COLUMN "reference",
DROP COLUMN "specs",
DROP COLUMN "warranty_months";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "barcode",
DROP COLUMN "combination_key",
DROP COLUMN "cost_amount",
DROP COLUMN "image_media_id",
DROP COLUMN "options";

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "stock_unit_id";

-- DropTable
DROP TABLE "stock_units";

-- DropEnum
DROP TYPE "UnitCondition";

-- DropEnum
DROP TYPE "StockUnitStatus";


-- Historique Prisma
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260929060000_catalog_products_variants_stock';
