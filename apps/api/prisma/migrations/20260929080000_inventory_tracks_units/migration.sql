-- AlterTable
ALTER TABLE "inventory_levels" ADD COLUMN     "tracks_units" BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- SQL manuel (docs/PLAN-CODE.md §5.1) : les variantes des catégories suivies à l'unité
-- (la catégorie ou l'un de ses parents) le deviennent.
WITH RECURSIVE "tracked" AS (
  SELECT "id" FROM "categories" WHERE "tracks_units"
  UNION
  SELECT c."id" FROM "categories" c JOIN "tracked" t ON c."parent_id" = t."id"
)
UPDATE "inventory_levels" l
   SET "tracks_units" = true
  FROM "product_variants" v
  JOIN "products" p ON p."id" = v."product_id"
 WHERE l."variant_id" = v."id"
   AND v."track_inventory"
   AND p."category_id" IN (SELECT "id" FROM "tracked");
