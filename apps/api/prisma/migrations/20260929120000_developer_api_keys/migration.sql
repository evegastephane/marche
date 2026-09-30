-- CreateEnum
CREATE TYPE "ApiKeyKind" AS ENUM ('PUBLISHABLE', 'SECRET');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ApiKeyKind" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token" TEXT,
    "prefix" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_origins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_token_hash_key" ON "api_keys"("token_hash");

-- CreateIndex
CREATE INDEX "api_keys_store_id_created_at_idx" ON "api_keys"("store_id", "created_at");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- SQL manuel (docs/PLAN-CODE.md §5.1) : ce que le schéma Prisma ne sait pas exprimer
-- Seule une clé publique garde sa valeur en clair (réaffichable) ; une clé secrète n'a que son empreinte.
ALTER TABLE "api_keys" ADD CONSTRAINT "api_key_token_only_publishable" CHECK (("kind" = 'PUBLISHABLE') = ("token" IS NOT NULL));
-- Les droits ne concernent que les clés secrètes, les origines que les clés publiques.
ALTER TABLE "api_keys" ADD CONSTRAINT "api_key_scopes_secret_only" CHECK ("kind" = 'SECRET' OR cardinality("scopes") = 0);
ALTER TABLE "api_keys" ADD CONSTRAINT "api_key_origins_publishable_only" CHECK ("kind" = 'PUBLISHABLE' OR cardinality("allowed_origins") = 0);
