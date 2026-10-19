-- Retour arrière de la migration phone_axes_sim_screen :
--   npx prisma db execute --file prisma/migrations/20260930170000_phone_axes_sim_screen/down.sql
--   (la dernière instruction retire la migration de l'historique : un « migrate deploy » la rejoue)
-- La taille d'écran revient dans la fiche des produits et redevient un nombre ; la SIM et « Open box »
-- ne sont retirés que là où aucune variante ne les utilise ; la RAM redevient obligatoire.

-- Garde-fou : un produit vendu en plusieurs tailles ne peut pas revenir à une seule taille de fiche.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "product_variants" WHERE "options" ? 'taille-ecran'
    GROUP BY "product_id" HAVING count(DISTINCT "options"->>'taille-ecran') > 1
  ) THEN
    RAISE EXCEPTION 'Des produits sont proposés en plusieurs tailles d''écran : gardez une taille par produit avant ce retour arrière.';
  END IF;
END $$;

-- Taille d'écran : des variantes vers la fiche (« 6,3 pouces » → 6.3).
UPDATE "products" p
SET "specs" = p."specs" || jsonb_build_object('taille-ecran', replace(split_part(v."options"->>'taille-ecran', ' ', 1), ',', '.')::numeric),
    "version" = p."version" + 1, "updated_at" = now()
FROM (
  SELECT DISTINCT ON ("product_id") "product_id", "options"
  FROM "product_variants" WHERE "options" ? 'taille-ecran'
  ORDER BY "product_id", "position"
) v
WHERE v."product_id" = p."id" AND split_part(v."options"->>'taille-ecran', ' ', 1) ~ '^[0-9]+(,[0-9]+)?$';

UPDATE "product_variants" v
SET "combination_key" = COALESCE((
      SELECT string_agg(seg, '|' ORDER BY split_part(seg, '=', 1))
      FROM unnest(string_to_array(v."combination_key", '|')) AS seg
      WHERE seg <> '' AND split_part(seg, '=', 1) <> 'taille-ecran'
    ), ''),
    "title" = CASE
      WHEN v."options" - 'taille-ecran' = '{}'::jsonb THEN 'Par défaut'
      ELSE replace(replace(v."title", ' / ' || (v."options"->>'taille-ecran'), ''), (v."options"->>'taille-ecran') || ' / ', '')
    END,
    "options" = v."options" - 'taille-ecran',
    "updated_at" = now()
WHERE v."options" ? 'taille-ecran';

DELETE FROM "attribute_values" x USING "attributes" a
WHERE x."attribute_id" = a."id" AND a."slug" = 'taille-ecran';

UPDATE "attributes" SET "type" = 'NUMBER', "is_variant_axis" = false, "filterable" = false, "unit" = 'pouces', "updated_at" = now()
WHERE "slug" = 'taille-ecran' AND "type" = 'SELECT';

-- « Open box » : retiré s'il n'est porté par aucune variante.
DELETE FROM "attribute_values" x USING "attributes" a
WHERE x."attribute_id" = a."id" AND a."slug" = 'etat' AND x."value" = 'Open box'
  AND NOT EXISTS (
    SELECT 1 FROM "product_variants" v WHERE v."store_id" = a."store_id" AND v."options"->>'etat' = 'Open box'
  );

-- SIM : attribut retiré (valeurs et liens suivent) s'il n'est porté par aucune variante.
DELETE FROM "attributes" a
WHERE a."slug" = 'sim'
  AND NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."store_id" = a."store_id" AND v."options" ? 'sim');

-- RAM de nouveau obligatoire sur les smartphones.
UPDATE "category_attributes" l SET "required" = true
FROM "categories" c, "attributes" a
WHERE l."category_id" = c."id" AND c."slug" = 'smartphones'
  AND l."attribute_id" = a."id" AND a."slug" = 'ram';

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260930170000_phone_axes_sim_screen';
