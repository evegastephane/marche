-- Photos importées depuis un lien (colonne « images » de l'import Excel) : le lien d'origine est gardé,
-- pour qu'un réimport retrouve la photo au lieu de la télécharger une seconde fois.
ALTER TABLE "media" ADD COLUMN "source_url" TEXT;

CREATE INDEX "media_store_id_source_url_idx" ON "media"("store_id", "source_url");
