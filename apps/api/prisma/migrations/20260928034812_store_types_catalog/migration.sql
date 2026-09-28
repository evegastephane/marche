-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('FASHION', 'ELECTRONICS');

-- CreateEnum
CREATE TYPE "ProductRelationType" AS ENUM ('ACCESSORY');

-- CreateEnum
CREATE TYPE "BundleDiscountType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "SpecialRequestStatus" AS ENUM ('NEW', 'QUOTED', 'DECLINED', 'CONVERTED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discounts" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "product_media" ADD COLUMN     "option_value" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "kind" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "type" "StoreType" NOT NULL DEFAULT 'FASHION',
ADD COLUMN     "vertical_settings" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "product_relations" (
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "related_product_id" UUID NOT NULL,
    "type" "ProductRelationType" NOT NULL DEFAULT 'ACCESSORY',
    "position" INTEGER NOT NULL,

    CONSTRAINT "product_relations_pkey" PRIMARY KEY ("product_id","related_product_id","type")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "anchor_product_id" UUID NOT NULL,
    "discount_type" "BundleDiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_items" (
    "store_id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("bundle_id","product_id")
);

-- CreateTable
CREATE TABLE "special_requests" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID,
    "product_title" TEXT NOT NULL,
    "product_slug" TEXT,
    "options" JSONB NOT NULL DEFAULT '[]',
    "quantity" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "status" "SpecialRequestStatus" NOT NULL DEFAULT 'NEW',
    "quoted_unit_price_amount" INTEGER,
    "quoted_delay" TEXT,
    "decline_reason" TEXT,
    "order_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_relations_related_product_id_idx" ON "product_relations"("related_product_id");

-- CreateIndex
CREATE INDEX "product_relations_store_id_idx" ON "product_relations"("store_id");

-- CreateIndex
CREATE INDEX "bundles_store_id_is_active_idx" ON "bundles"("store_id", "is_active");

-- CreateIndex
CREATE INDEX "bundles_anchor_product_id_idx" ON "bundles"("anchor_product_id");

-- CreateIndex
CREATE INDEX "bundle_items_product_id_idx" ON "bundle_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "special_requests_order_id_key" ON "special_requests"("order_id");

-- CreateIndex
CREATE INDEX "special_requests_store_id_status_created_at_idx" ON "special_requests"("store_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "products_store_id_kind_idx" ON "products"("store_id", "kind");

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_anchor_product_id_fkey" FOREIGN KEY ("anchor_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
