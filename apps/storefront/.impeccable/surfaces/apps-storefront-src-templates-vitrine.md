---
version: 1
slug: "apps-storefront-src-templates-vitrine"
primary_target: "apps/storefront/src/templates/vitrine"
related_targets: []
---

# Template « La vitrine du vendeur » (id `vitrine`)

Scope: site public d'une boutique d'électronique (téléphones, tablettes, ordinateurs, montres, accessoires) ; toutes les pages du site. Mode : Persuade.
Audience : acheteurs qui comparent les prix des téléphones, souvent reconditionnés, au téléphone ; la confiance passe par l'état, la garantie et le prix affiché.
Job : trouver l'appareil, le configurer (stockage, couleur, état), voir le prix se recomposer, ajouter chargeur ou écouteurs, ou commander une configuration absente.
Constraints : palettes préréglées seulement (7), polices fixes, prix dans la devise de la boutique, WCAG AA, `prefers-reduced-motion`.

## Direction contract

THESIS: le site est le comptoir vitré d'un vendeur de téléphones : chaque appareil est posé sur son présentoir derrière le verre, avec son étiquette de prix et l'état écrit au marqueur ; refuse la page blanche façon marque.
OWN-WORLD: fond du comptoir (sombre ou clair selon la palette), étagère de verre marquée d'un filet lumineux, ombre de présentoir sous chaque appareil ; étiquettes de prix percées (Barlow Condensed), mentions d'état au marqueur (Permanent Marker) ; la couleur d'étiquette sert l'action.
STORY: on longe la vitrine, on s'arrête sur un appareil, on règle stockage, couleur et état, l'étiquette se retourne sur le bon prix, on ajoute les accessoires d'un geste.
FIRST VIEWPORT: enseigne lumineuse au nom de la boutique ; dessous, une étagère de verre qui porte trois ou quatre appareils vedettes sur présentoirs, chacun avec son étiquette de prix ; « Voir la vitrine » sur l'étiquette principale.
FORM: 1 de ma liste (le comptoir du vendeur), carte « choix d'Impeccable », seed 5992c632.
SIGNATURE: changer un réglage fait pivoter l'étiquette sur sa ficelle et rouler les chiffres du prix ; une configuration absente affiche « Sur commande ».
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
