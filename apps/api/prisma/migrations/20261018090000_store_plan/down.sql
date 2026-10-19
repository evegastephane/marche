-- Retour arrière de la migration store_plan :
--   npx prisma db execute --file prisma/migrations/20261018090000_store_plan/down.sql
-- Toutes les boutiques retrouvent l'accès à tous les modèles (il n'y a plus de formule).
ALTER TABLE "stores" DROP COLUMN IF EXISTS "plan";
DROP TYPE IF EXISTS "StorePlan";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261018090000_store_plan';
