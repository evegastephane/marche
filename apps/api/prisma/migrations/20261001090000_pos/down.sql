-- Retour arrière de la migration pos :
--   npx prisma db execute --file prisma/migrations/20261001090000_pos/down.sql
-- Les ventes de caisse redeviennent des commandes du back-office (source ADMIN), et un client connu
-- par son seul téléphone reçoit une adresse provisoire, l'e-mail redevenant obligatoire.
DROP TABLE IF EXISTS "order_return_lines";
DROP TABLE IF EXISTS "order_returns";
DROP TABLE IF EXISTS "order_payments";
DROP TABLE IF EXISTS "cash_movements";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_pos_session_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_refunded_amount_check";
DROP INDEX IF EXISTS "orders_pos_session_id_idx";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "pos_session_id", DROP COLUMN IF EXISTS "refunded_amount";
DROP TABLE IF EXISTS "pos_sessions";
DROP TABLE IF EXISTS "pos_settings";
DROP TYPE IF EXISTS "CashMovementType";
DROP TYPE IF EXISTS "PosSessionStatus";
DROP TYPE IF EXISTS "PaymentKind";
DROP TYPE IF EXISTS "PaymentMethod";

ALTER TYPE "OrderSource" RENAME TO "OrderSource_old";
CREATE TYPE "OrderSource" AS ENUM ('ADMIN', 'STOREFRONT');
ALTER TABLE "orders" ALTER COLUMN "source" TYPE "OrderSource"
  USING (CASE WHEN "source"::text = 'POS' THEN 'ADMIN' ELSE "source"::text END)::"OrderSource";
DROP TYPE "OrderSource_old";

DROP INDEX IF EXISTS "customers_store_id_phone_idx";
UPDATE "customers" SET "email" = 'comptoir-' || "id" || '@telephone.invalid' WHERE "email" IS NULL;
ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL;

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261001090000_pos';
