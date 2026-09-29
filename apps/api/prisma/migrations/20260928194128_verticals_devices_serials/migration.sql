-- CreateEnum
CREATE TYPE "SpecialRequestType" AS ENUM ('CONFIGURATION', 'TRADE_IN', 'MADE_TO_MEASURE');

-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN     "serial_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "special_requests" ADD COLUMN     "details" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "type" "SpecialRequestType" NOT NULL DEFAULT 'CONFIGURATION';

-- CreateTable
CREATE TABLE "device_models" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "search_name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER,
    "attributes" JSONB NOT NULL,
    "storages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colors" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_models_search_name_idx" ON "device_models"("search_name");

-- CreateIndex
CREATE UNIQUE INDEX "device_models_provider_provider_id_key" ON "device_models"("provider", "provider_id");
