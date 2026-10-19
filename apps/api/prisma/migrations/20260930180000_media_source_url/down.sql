-- Retour arrière de la migration media_source_url :
--   npx prisma db execute --file prisma/migrations/20260930180000_media_source_url/down.sql
DROP INDEX IF EXISTS "media_store_id_source_url_idx";
ALTER TABLE "media" DROP COLUMN IF EXISTS "source_url";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260930180000_media_source_url';
