-- Retour arrière de la migration inventory_tracks_units (docs/PLAN-CODE.md §5.1) :
--   npx prisma db execute --file prisma/migrations/20260929080000_inventory_tracks_units/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)

-- AlterTable
ALTER TABLE "inventory_levels" DROP COLUMN "tracks_units";

-- Historique Prisma
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260929080000_inventory_tracks_units';
