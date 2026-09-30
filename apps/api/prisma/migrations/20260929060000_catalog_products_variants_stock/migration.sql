-- CreateEnum
CREATE TYPE "UnitCondition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "StockUnitStatus" AS ENUM ('IN_STOCK', 'SOLD', 'REMOVED');

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "combination_key" TEXT,
ADD COLUMN     "cost_amount" INTEGER,
ADD COLUMN     "image_media_id" UUID,
ADD COLUMN     "options" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category_id" UUID,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "specs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "warranty_months" INTEGER;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "stock_unit_id" UUID;

-- CreateTable
CREATE TABLE "stock_units" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "condition" "UnitCondition" NOT NULL DEFAULT 'NEW',
    "battery_health" INTEGER,
    "status" "StockUnitStatus" NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT,
    "order_line_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_units_variant_id_status_idx" ON "stock_units"("variant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_units_store_id_serial_key" ON "stock_units"("store_id", "serial");

-- CreateIndex
CREATE INDEX "product_variants_store_id_barcode_idx" ON "product_variants"("store_id", "barcode");

-- CreateIndex
CREATE INDEX "product_variants_options_gin" ON "product_variants" USING GIN ("options" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_combination_key_key" ON "product_variants"("product_id", "combination_key");

-- CreateIndex
CREATE INDEX "products_store_id_category_id_status_idx" ON "products"("store_id", "category_id", "status");

-- CreateIndex
CREATE INDEX "products_specs_gin" ON "products" USING GIN ("specs" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "products_store_id_reference_key" ON "products"("store_id", "reference");

-- CreateIndex
CREATE INDEX "stock_movements_stock_unit_id_idx" ON "stock_movements"("stock_unit_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_image_media_id_fkey" FOREIGN KEY ("image_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_unit_id_fkey" FOREIGN KEY ("stock_unit_id") REFERENCES "stock_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- SQL manuel (docs/PLAN-CODE.md §5.1) : ce que le schéma Prisma ne sait pas exprimer
ALTER TABLE "stock_units" ADD CONSTRAINT "battery_health_percent"
  CHECK ("battery_health" IS NULL OR "battery_health" BETWEEN 0 AND 100);
ALTER TABLE "product_variants" ADD CONSTRAINT "cost_non_negative" CHECK ("cost_amount" IS NULL OR "cost_amount" >= 0);
ALTER TABLE "product_variants" ADD CONSTRAINT "options_is_object" CHECK (jsonb_typeof("options") = 'object');
ALTER TABLE "products" ADD CONSTRAINT "specs_is_object" CHECK (jsonb_typeof("specs") = 'object');
ALTER TABLE "products" ADD CONSTRAINT "warranty_months_range"
  CHECK ("warranty_months" IS NULL OR "warranty_months" BETWEEN 0 AND 120);

-- Journal du stock (règle 1) : le stock en main d'une variante est la somme de ses mouvements.
-- inventory_levels.on_hand n'en est qu'une projection, tenue à jour par la base elle-même.

-- 1. Reprise : un écart éventuel entre la projection et le journal devient un ajustement explicite.
INSERT INTO "stock_movements" ("id", "store_id", "variant_id", "type", "quantity", "on_hand_after", "reason", "created_at")
SELECT uuidv7(), l."store_id", l."variant_id", 'ADJUSTMENT', l."on_hand" - COALESCE(m."total", 0), l."on_hand",
       'Reprise du journal', now()
  FROM "inventory_levels" l
  LEFT JOIN (SELECT "variant_id", SUM("quantity") AS "total" FROM "stock_movements" GROUP BY "variant_id") m
         ON m."variant_id" = l."variant_id"
 WHERE l."on_hand" <> COALESCE(m."total", 0);

-- 2. Stock recalculé depuis le journal (audit : doit toujours égaler inventory_levels.on_hand).
CREATE VIEW "variant_stock" AS
SELECT v."id" AS "variant_id", v."store_id", COALESCE(SUM(m."quantity"), 0)::integer AS "on_hand"
  FROM "product_variants" v
  LEFT JOIN "stock_movements" m ON m."variant_id" = v."id"
 GROUP BY v."id", v."store_id";

-- 3. Chaque mouvement applique sa quantité à la projection et fixe on_hand_after, dans la même transaction.
--    La contrainte stock_consistent (on_hand >= reserved >= 0) refuse un mouvement qui rendrait le stock incohérent.
CREATE FUNCTION "stock_movement_apply"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  after_quantity integer;
BEGIN
  UPDATE "inventory_levels"
     SET "on_hand" = "on_hand" + NEW."quantity", "version" = "version" + 1, "updated_at" = now()
   WHERE "variant_id" = NEW."variant_id" AND "store_id" = NEW."store_id"
  RETURNING "on_hand" INTO after_quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun niveau de stock pour la variante %', NEW."variant_id" USING ERRCODE = 'foreign_key_violation';
  END IF;
  NEW."on_hand_after" := after_quantity;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "stock_movements_apply" BEFORE INSERT ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION "stock_movement_apply"();

-- 4. Le stock en main ne se modifie jamais directement : seul le déclencheur du journal y touche.
CREATE FUNCTION "inventory_on_hand_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."on_hand" <> 0 THEN
    RAISE EXCEPTION 'Un niveau de stock naît à 0 : le stock initial est un mouvement' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."on_hand" IS DISTINCT FROM OLD."on_hand" AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Le stock en main ne change que par un mouvement (stock_movements)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "inventory_levels_on_hand_guard" BEFORE INSERT OR UPDATE ON "inventory_levels"
  FOR EACH ROW EXECUTE FUNCTION "inventory_on_hand_guard"();

-- 5. Un mouvement est immuable : une correction est un contre-mouvement.
--    (stock_unit_id reste modifiable pour la mise à NULL de la clé étrangère.)
CREATE FUNCTION "stock_movement_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Un mouvement de stock ne se modifie pas : enregistrer un contre-mouvement' USING ERRCODE = 'check_violation';
END;
$$;
CREATE TRIGGER "stock_movements_immutable"
  BEFORE UPDATE OF "store_id", "variant_id", "type", "quantity", "on_hand_after", "reason", "order_id", "actor_user_id", "created_at"
  ON "stock_movements" FOR EACH ROW EXECUTE FUNCTION "stock_movement_immutable"();
