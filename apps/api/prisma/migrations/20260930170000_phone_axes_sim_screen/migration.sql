-- Téléphones décrits jusqu'au bout (2026-09-30) : la SIM et la taille d'écran deviennent des choix
-- (axes de variante), « Open box » rejoint les états, la RAM devient facultative sur les smartphones.
-- Seules les boutiques dont le catalogue de départ Électronique est posé sont touchées : celles qui ont
-- une catégorie « smartphones » (SIM, RAM) ou un attribut « taille-ecran » / « etat ».
-- La taille d'écran des produits existants passe de leur fiche (specs) à leurs variantes, en valeur
-- unique : prix, stock, IMEI et SKU ne changent pas. Retour arrière : down.sql.

-- ───────────── 1. SIM : attribut (axe), valeurs, lien avec la catégorie Smartphones ─────────────

INSERT INTO "attributes" ("id", "store_id", "name", "slug", "type", "unit", "is_variant_axis", "filterable", "position", "created_at", "updated_at")
SELECT uuidv7(), c."store_id", 'SIM', 'sim', 'SELECT', NULL, true, true,
       COALESCE((SELECT max(a."position") + 1 FROM "attributes" a WHERE a."store_id" = c."store_id"), 0), now(), now()
FROM "categories" c
WHERE c."slug" = 'smartphones'
  AND NOT EXISTS (SELECT 1 FROM "attributes" a WHERE a."store_id" = c."store_id" AND a."slug" = 'sim');

INSERT INTO "attribute_values" ("id", "store_id", "attribute_id", "value", "code", "position", "created_at", "updated_at")
SELECT uuidv7(), a."store_id", a."id", v."value", v."code", v."position", now(), now()
FROM "attributes" a
CROSS JOIN (VALUES ('Nano-SIM', 'NANO', 0), ('Double SIM', 'DUAL', 1), ('eSIM', 'ESIM', 2)) AS v ("value", "code", "position")
WHERE a."slug" = 'sim' AND a."type" = 'SELECT'
  AND NOT EXISTS (SELECT 1 FROM "attribute_values" x WHERE x."attribute_id" = a."id" AND lower(x."value") = lower(v."value"));

-- Le lien se place juste après « État » dans la catégorie (les suivants reculent d'un rang).
WITH target AS (
  SELECT c."id" AS category_id, c."store_id", a."id" AS attribute_id,
         COALESCE((SELECT l."position" FROM "category_attributes" l JOIN "attributes" e ON e."id" = l."attribute_id"
                   WHERE l."category_id" = c."id" AND e."slug" = 'etat'), -1) + 1 AS position
  FROM "categories" c
  JOIN "attributes" a ON a."store_id" = c."store_id" AND a."slug" = 'sim'
  WHERE c."slug" = 'smartphones'
    AND NOT EXISTS (SELECT 1 FROM "category_attributes" l WHERE l."category_id" = c."id" AND l."attribute_id" = a."id")
), shifted AS (
  UPDATE "category_attributes" l SET "position" = l."position" + 1
  FROM target t
  WHERE l."category_id" = t.category_id AND l."position" >= t.position
  RETURNING 1
)
INSERT INTO "category_attributes" ("store_id", "category_id", "attribute_id", "required", "position")
SELECT t."store_id", t.category_id, t.attribute_id, false, t.position FROM target t;

-- ───────────── 2. « Open box » juste après « Neuf » dans les états ─────────────

UPDATE "attribute_values" v SET "position" = v."position" + 1, "updated_at" = now()
FROM "attributes" a, "attribute_values" neuf
WHERE a."slug" = 'etat' AND a."type" = 'SELECT'
  AND v."attribute_id" = a."id" AND neuf."attribute_id" = a."id" AND neuf."value" = 'Neuf'
  AND v."position" > neuf."position"
  AND NOT EXISTS (SELECT 1 FROM "attribute_values" x WHERE x."attribute_id" = a."id" AND lower(x."value") = 'open box');

INSERT INTO "attribute_values" ("id", "store_id", "attribute_id", "value", "code", "position", "created_at", "updated_at")
SELECT uuidv7(), a."store_id", a."id", 'Open box', 'OBX',
       COALESCE((SELECT n."position" FROM "attribute_values" n WHERE n."attribute_id" = a."id" AND n."value" = 'Neuf'), -1) + 1,
       now(), now()
FROM "attributes" a
WHERE a."slug" = 'etat' AND a."type" = 'SELECT'
  AND NOT EXISTS (SELECT 1 FROM "attribute_values" x WHERE x."attribute_id" = a."id" AND lower(x."value") = 'open box');

-- ───────────── 3. Taille d'écran : d'un nombre de la fiche à un choix ─────────────

-- 3a. Valeurs : les tailles courantes et celles déjà saisies sur les produits (« 6,3 pouces »).
WITH screen AS (
  SELECT a."id", a."store_id" FROM "attributes" a WHERE a."slug" = 'taille-ecran' AND a."type" = 'NUMBER'
), sizes AS (
  SELECT s."id" AS attribute_id, s."store_id", t.size
  FROM screen s
  CROSS JOIN unnest(ARRAY[5.4, 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 8.3, 10.9, 11, 12.9, 13, 13.3, 13.6, 14, 15.3, 16]::numeric[]) AS t (size)
  UNION
  SELECT s."id", s."store_id", trim_scale((p."specs"->>'taille-ecran')::numeric)
  FROM screen s
  JOIN "products" p ON p."store_id" = s."store_id"
  WHERE jsonb_typeof(p."specs"->'taille-ecran') = 'number' AND (p."specs"->>'taille-ecran')::numeric > 0
), labelled AS (
  SELECT attribute_id, "store_id",
         replace(trim_scale(size)::text, '.', ',') || ' pouces' AS value,
         replace(trim_scale(size)::text, '.', '') || 'PO' AS code,
         (row_number() OVER (PARTITION BY attribute_id ORDER BY size) - 1)::int AS position
  FROM sizes
)
INSERT INTO "attribute_values" ("id", "store_id", "attribute_id", "value", "code", "position", "created_at", "updated_at")
SELECT uuidv7(), l."store_id", l.attribute_id, l.value, l.code, l.position, now(), now()
FROM labelled l
WHERE NOT EXISTS (SELECT 1 FROM "attribute_values" x WHERE x."attribute_id" = l.attribute_id AND lower(x."value") = lower(l.value));

-- 3b. L'attribut devient un choix (axe de variante), filtrable sur le site.
UPDATE "attributes" SET "type" = 'SELECT', "is_variant_axis" = true, "filterable" = true, "unit" = 'pouces', "updated_at" = now()
WHERE "slug" = 'taille-ecran' AND "type" = 'NUMBER';

-- 3c. La taille des produits existants passe de la fiche à toutes leurs variantes (valeur unique) :
-- options, clé de combinaison (segments triés par slug, comme combinationKey) et libellé.
WITH moved AS (
  SELECT p."id" AS product_id,
         replace(trim_scale((p."specs"->>'taille-ecran')::numeric)::text, '.', ',') || ' pouces' AS label
  FROM "products" p
  JOIN "attributes" a ON a."store_id" = p."store_id" AND a."slug" = 'taille-ecran' AND a."is_variant_axis"
  WHERE jsonb_typeof(p."specs"->'taille-ecran') = 'number' AND (p."specs"->>'taille-ecran')::numeric > 0
    AND NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."product_id" = p."id" AND v."options" ? 'taille-ecran')
)
UPDATE "product_variants" v
SET "options" = v."options" || jsonb_build_object('taille-ecran', m.label),
    "combination_key" = (
      SELECT string_agg(seg, '|' ORDER BY split_part(seg, '=', 1))
      FROM unnest(string_to_array(v."combination_key", '|') || ARRAY['taille-ecran=' || lower(m.label)]) AS seg
      WHERE seg <> ''
    ),
    "title" = CASE WHEN v."options" = '{}'::jsonb THEN m.label ELSE v."title" || ' / ' || m.label END,
    "updated_at" = now()
FROM moved m
WHERE v."product_id" = m.product_id;

UPDATE "products" p
SET "specs" = p."specs" - 'taille-ecran', "version" = p."version" + 1, "updated_at" = now()
WHERE p."specs" ? 'taille-ecran'
  AND EXISTS (SELECT 1 FROM "product_variants" v WHERE v."product_id" = p."id" AND v."options" ? 'taille-ecran');

-- ───────────── 4. RAM facultative sur les smartphones ─────────────

UPDATE "category_attributes" l SET "required" = false
FROM "categories" c, "attributes" a
WHERE l."category_id" = c."id" AND c."slug" = 'smartphones'
  AND l."attribute_id" = a."id" AND a."slug" = 'ram';
