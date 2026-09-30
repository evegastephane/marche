-- Retour arrière de la migration developer_api_keys (docs/PLAN-CODE.md §5.1) :
--   npx prisma db execute --file prisma/migrations/20260929120000_developer_api_keys/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)
-- Supprime les clés d'API des boutiques : les fronts qui les utilisent perdent l'accès.

DROP TABLE IF EXISTS "api_keys";
DROP TYPE IF EXISTS "ApiKeyKind";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260929120000_developer_api_keys';
