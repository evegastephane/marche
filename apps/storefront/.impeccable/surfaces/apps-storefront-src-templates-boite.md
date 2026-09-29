---
version: 1
slug: "apps-storefront-src-templates-boite"
primary_target: "apps/storefront/src/templates/boite"
related_targets: []
---

# Template « La boîte du téléphone » (id `boite`)

Scope: site public d'une boutique d'électronique (téléphones, tablettes, ordinateurs, montres, accessoires) ; toutes les pages du site. Mode : Persuade (l'acheteur choisit et commande).
Audience : acheteurs de téléphones neufs et reconditionnés à Dakar ou Abidjan, au téléphone ; ils vérifient capacité, couleur, état et garantie avant de payer.
Job : reconnaître l'appareil, lire sa configuration sans ambiguïté, cocher la sienne, ajouter les accessoires, commander.
Constraints : palettes préréglées seulement, polices fixes, prix dans la devise de la boutique, WCAG AA, `prefers-reduced-motion`. Données réelles seulement : le code-barres encode le vrai SKU (Code 128), la garantie vient de l'attribut du produit.

## Direction contract

THESIS: chaque appareil se présente comme sa boîte d'origine : une face avant épurée (la photo, le nom, rien d'autre) et l'étiquette latérale où l'on coche capacité, couleur et état, avec la référence en code-barres ; refuse le rendu de site de marque et la grille dense de revendeur.
OWN-WORLD: carton mat en fond, encre noire d'impression, gris d'étiquette, une seule couleur d'action (cases cochées, bouton, chiffres vivants) ; plis de la boîte en filets, étiquette en Geist Mono (données, références, caractéristiques), face avant en Geist léger en capitales espacées ; sceau rond de garantie quand l'attribut existe.
STORY: on reconnaît l'appareil à sa boîte, on retourne la boîte pour lire l'étiquette, on coche sa configuration, on l'emporte.
FIRST VIEWPORT: la boîte de l'appareil vedette de face (grande photo sur carton, nom en capitales espacées, nom de la boutique imprimé comme la marque), l'étiquette latérale dépliée à côté avec ses cases et son prix ; « Voir les boîtes » sous l'étiquette dans la couleur d'action ; la pile des autres boîtes dessous.
FORM: carte « choix d'Impeccable » (1 de ma liste), seed ff7be501.
SIGNATURE: cocher une case trace la coche à l'encre et régénère le code-barres de la référence choisie, balayé par la ligne du lecteur ; la boîte se tourne légèrement au survol et montre sa tranche.
RAISES: une seule couleur pour les chiffres vivants et l'action (télétexte) ; l'ancien prix reste barré en fantôme sous le nouveau (manière noire).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
