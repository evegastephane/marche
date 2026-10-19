-- Formule de la boutique : Premium débloque les modèles de site payants (tous sauf le natif).
CREATE TYPE "StorePlan" AS ENUM ('FREE', 'PREMIUM');

ALTER TABLE "stores" ADD COLUMN "plan" "StorePlan" NOT NULL DEFAULT 'FREE';

-- Les boutiques qui utilisent déjà un modèle devenu Premium le gardent : elles passent en Premium.
UPDATE "stores" SET "plan" = 'PREMIUM'
WHERE "id" IN (
  SELECT "store_id" FROM "sites"
  WHERE "template_id" <> 'default'
     OR coalesce("theme_settings"->>'template', 'default') <> 'default'
     OR coalesce("draft_theme_settings"->>'template', 'default') <> 'default'
);
