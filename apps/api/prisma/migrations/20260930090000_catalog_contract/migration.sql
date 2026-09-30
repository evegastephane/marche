-- Migration « contract » du catalogue dynamique : l'ancien modèle (sorte d'article, fiche codée en dur,
-- options positionnelles) disparaît ; chaque produit a une catégorie, chaque variante sa combinaison.
-- La reprise des données anciennes (script db:backfill-catalog, retiré ensuite) doit être passée avant.

-- Garde-fou : message clair plutôt qu'un échec obscur sur SET NOT NULL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "products" WHERE "category_id" IS NULL)
     OR EXISTS (SELECT 1 FROM "product_variants" WHERE "combination_key" IS NULL) THEN
    RAISE EXCEPTION 'Produits sans catégorie ou variantes sans combinaison : passez la reprise du catalogue avant cette migration.';
  END IF;
END $$;

-- DropIndex
DROP INDEX "products_store_id_kind_idx";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "option_values",
ALTER COLUMN "combination_key" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "attributes",
DROP COLUMN "kind",
DROP COLUMN "options",
ALTER COLUMN "category_id" SET NOT NULL;
