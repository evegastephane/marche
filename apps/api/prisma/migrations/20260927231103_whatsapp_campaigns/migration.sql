-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('SENDING', 'DONE');

-- CreateEnum
CREATE TYPE "CampaignMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- DropIndex
DROP INDEX "products_title_trgm";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "whatsapp_opt_in_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_opt_out_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID,
    "product_title" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'SENDING',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_messages" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "customer_id" UUID,
    "phone" TEXT NOT NULL,
    "first_name" TEXT,
    "status" "CampaignMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_store_id_created_at_idx" ON "campaigns"("store_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_messages_provider_message_id_key" ON "campaign_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "campaign_messages_campaign_id_status_idx" ON "campaign_messages"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_messages_store_id_idx" ON "campaign_messages"("store_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
