-- Retour arrière de la migration catalog_contract (docs/PLAN-CODE.md §5.1) :
--   npx prisma db execute --file prisma/migrations/20260930090000_catalog_contract/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)
-- Reprise au mieux : les colonnes anciennes reviennent, remplies depuis le nouveau modèle
-- (valeurs d'axes par ordre alphabétique des axes, fiche = specs). « kind » reste vide.

ALTER TABLE "products" ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "kind" TEXT,
ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "category_id" DROP NOT NULL;

ALTER TABLE "product_variants" ADD COLUMN "option_values" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "combination_key" DROP NOT NULL;

CREATE INDEX "products_store_id_kind_idx" ON "products"("store_id", "kind");

UPDATE "product_variants" v
SET "option_values" = COALESCE((SELECT jsonb_agg(e.value ORDER BY e.key) FROM jsonb_each(v."options") e), '[]'::jsonb);

UPDATE "products" p
SET "options" = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('name', a.key, 'values', a.vals) ORDER BY a.key)
  FROM (
    SELECT e.key, jsonb_agg(DISTINCT e.value) AS vals
    FROM "product_variants" v, jsonb_each(v."options") e
    WHERE v."product_id" = p."id" AND v."archived_at" IS NULL
    GROUP BY e.key
  ) a
), '[]'::jsonb),
"attributes" = p."specs";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260930090000_catalog_contract';
