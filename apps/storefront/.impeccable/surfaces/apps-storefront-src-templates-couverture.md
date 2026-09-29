---
version: 1
slug: "apps-storefront-src-templates-couverture"
primary_target: "apps/storefront/src/templates/couverture"
related_targets: []
---

# Template « La couverture de magazine » (id `couverture`)

Scope: site public d'une boutique de mode (vêtements, chaussures, accessoires) ; toutes les pages du site. Mode : Persuade (l'acheteuse est séduite, choisit et commande).
Audience : clientes et clients de boutiques de mode à Dakar ou Abidjan, surtout au téléphone, souvent arrivés par un lien partagé ; ils veulent voir la pièce, son prix et leur taille.
Job : être séduit par la une, feuilleter, trouver sa taille, commander.
Constraints : palettes préréglées seulement, polices fixes (Big Shoulders, Schibsted Grotesk), prix dans la devise de la boutique, WCAG AA, `prefers-reduced-motion`. Données réelles seulement : le mois du numéro est le mois courant ; les titres de couverture sont de vrais articles avec leur vrai prix ; aucun numéro de page, tirage ou chiffre inventé ; pas de sur-titre au-dessus des titres.

## Direction contract

THESIS: la boutique publie son numéro du mois : l'accueil est la une (le nom de la boutique en titre de magazine, la pièce la plus récente en photo de couverture, les autres articles en titres de couverture avec leur prix), le catalogue est le sommaire, la fiche est une page mode avec ses crédits ; refuse le lookbook blanc en capitales fines et la grille de place de marché.
OWN-WORLD: couleur de une en aplat pleine force qui prend toute la couverture, papier blanc (ou noir) pour les pages intérieures, encadrés en seconde couleur franche ; titre de magazine et titres de couverture en Big Shoulders très gras et serré, texte et crédits en Schibsted Grotesk ; pastille ronde « Nouveauté » ; aucun dégradé, aucun filet fin de journal.
STORY: on reconnaît la boutique à sa une, on lit les titres et leurs prix, on feuillette le sommaire, on ouvre la page mode, on imprime sa taille, on commande.
FIRST VIEWPORT: la couverture en plein écran sur l'aplat de une : le nom de la boutique en titre géant sur toute la largeur, « Le numéro de {mois} » dessous ; au centre la photo de la pièce vedette en grand ; deux titres de couverture à gauche et deux à droite (nom de l'article, prix) ; la pastille « Nouveauté » sur le bord de la photo ; « Feuilleter le numéro » en coin corné en bas à droite.
FORM: 5 de ma liste (la couverture de magazine), carte du tirage, seed e342c897.
SIGNATURE: survoler « Feuilleter » soulève le coin de la page ; chaque page entre en tournant depuis la reliure ; la taille choisie s'imprime dans la couleur d'action, les autres gardent leur contour, les épuisées restent en fantôme.
RAISES: aplats jamais mélangés (bain de marbrure) ; tailles épuisées dessinées en fantôme (chiffres à segments) ; la photo jamais recouverte, les titres tournent autour (disque d'accrétion) ; un seul mouvement, la page qui tourne (cartes à collectionner) ; rubriques en blocs coupés net séparés par des vides francs (carrière de nuages) ; l'état actif imprime sa couleur, l'inactif garde son contour (estampe).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
