-- Caisse (point de vente) : sessions de caisse, encaissements et remboursements, mouvements d'espèces,
-- retours et échanges, réglages de la caisse. Un client du comptoir peut n'être connu que par son téléphone.

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'EXCHANGE', 'OTHER');
CREATE TYPE "PaymentKind" AS ENUM ('PAYMENT', 'REFUND');
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementType" AS ENUM ('IN', 'OUT');

-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'POS';

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN "pos_session_id" UUID,
ADD COLUMN "refunded_amount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "label" TEXT,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opened_by_user_id" UUID NOT NULL,
    "opening_float" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by_user_id" UUID,
    "closed_at" TIMESTAMP(3),
    "expected_cash" INTEGER,
    "counted_cash" INTEGER,
    "closing_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_payments" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "session_id" UUID,
    "kind" "PaymentKind" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "tendered_amount" INTEGER,
    "provider" TEXT,
    "reference" TEXT,
    "return_id" UUID,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_returns" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "session_id" UUID,
    "reason" TEXT NOT NULL,
    "restocked" BOOLEAN NOT NULL,
    "refund_amount" INTEGER NOT NULL,
    "refund_method" "PaymentMethod" NOT NULL,
    "credit_remaining" INTEGER NOT NULL DEFAULT 0,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_return_lines" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "serials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "order_return_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pos_settings" (
    "store_id" UUID NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pos_settings_pkey" PRIMARY KEY ("store_id")
);

-- CreateIndex
CREATE INDEX "pos_sessions_store_id_opened_at_idx" ON "pos_sessions"("store_id", "opened_at" DESC);
CREATE INDEX "pos_sessions_store_id_status_idx" ON "pos_sessions"("store_id", "status");
CREATE INDEX "cash_movements_session_id_created_at_idx" ON "cash_movements"("session_id", "created_at");
CREATE INDEX "order_payments_order_id_idx" ON "order_payments"("order_id");
CREATE INDEX "order_payments_session_id_idx" ON "order_payments"("session_id");
CREATE INDEX "order_returns_order_id_idx" ON "order_returns"("order_id");
CREATE INDEX "order_returns_session_id_idx" ON "order_returns"("session_id");
CREATE INDEX "order_return_lines_return_id_idx" ON "order_return_lines"("return_id");
CREATE INDEX "customers_store_id_phone_idx" ON "customers"("store_id", "phone");
CREATE INDEX "orders_pos_session_id_idx" ON "orders"("pos_session_id");

-- Une seule caisse ouverte par vendeur et par boutique (Prisma ne sait pas décrire un index partiel).
CREATE UNIQUE INDEX "pos_sessions_one_open_per_user" ON "pos_sessions"("store_id", "opened_by_user_id") WHERE "status" = 'OPEN';

-- Montants : jamais négatifs ; encaissements et mouvements strictement positifs.
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_amounts_check"
  CHECK ("opening_float" >= 0 AND ("counted_cash" IS NULL OR "counted_cash" >= 0));
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closed_check"
  CHECK (("status" = 'OPEN') = ("closed_at" IS NULL));
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_amount_check" CHECK ("amount" > 0);
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_amount_check"
  CHECK ("amount" > 0 AND ("tendered_amount" IS NULL OR "tendered_amount" >= "amount"));
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_amounts_check"
  CHECK ("refund_amount" >= 0 AND "credit_remaining" >= 0 AND "credit_remaining" <= "refund_amount");
ALTER TABLE "order_return_lines" ADD CONSTRAINT "order_return_lines_check" CHECK ("quantity" > 0 AND "amount" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_amount_check"
  CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "total_amount");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_return_lines" ADD CONSTRAINT "order_return_lines_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
