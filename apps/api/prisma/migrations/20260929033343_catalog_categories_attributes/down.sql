-- Retour arrière de la migration catalog_categories_attributes (docs/PLAN-CODE.md §5.1) :
--   npx prisma db execute --file prisma/migrations/20260929033343_catalog_categories_attributes/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)
-- Supprime les catégories et attributs des boutiques (données perdues).

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_store_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "attributes" DROP CONSTRAINT "attributes_store_id_fkey";

-- DropForeignKey
ALTER TABLE "category_attributes" DROP CONSTRAINT "category_attributes_category_id_fkey";

-- DropForeignKey
ALTER TABLE "category_attributes" DROP CONSTRAINT "category_attributes_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "attribute_values" DROP CONSTRAINT "attribute_values_attribute_id_fkey";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "attributes";

-- DropTable
DROP TABLE "category_attributes";

-- DropTable
DROP TABLE "attribute_values";

-- DropEnum
DROP TYPE "AttributeType";


-- Historique Prisma
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260929033343_catalog_categories_attributes';
