---
version: 1
slug: "apps-storefront-src-templates-enseigne"
primary_target: "apps/storefront/src/templates/enseigne"
related_targets: []
---

# Template « L'enseigne lumineuse » (id `enseigne`)

Scope: site public d'une boutique d'électronique (téléphones, tablettes, ordinateurs, montres, accessoires) ; toutes les pages du site. Mode : Persuade (l'acheteur compare, choisit et commande).
Audience : acheteurs de téléphones neufs et reconditionnés à Dakar ou Abidjan, souvent le soir, au téléphone ; ils comparent les prix d'un modèle à l'autre et vérifient stockage, état et garantie.
Job : repérer la boutique, comparer les prix d'un coup d'œil, régler sa configuration, commander.
Constraints : palettes préréglées seulement, polices fixes (Doto pour l'enseigne, Atkinson Hyperlegible Next pour le texte), prix réels dans la devise de la boutique, WCAG AA, `prefers-reduced-motion` (l'enseigne s'arrête et reste lisible), bandeau défilant qu'on peut mettre en pause. Le bandeau ne dit que des vérités : nom, rayons, services réellement activés, annonce de la boutique.

## Direction contract

THESIS: le site est la devanture lumineuse du vendeur de téléphones : le nom et les services défilent en points LED, chaque prix s'allume en chiffres à sept segments, les appareils se regardent sur l'étal éclairé ; refuse la page de marque noire au rendu produit et la grille de place de marché à badges rouges.
OWN-WORLD: fond de boutique la nuit (ou mur clair selon la palette), une seule couleur de LED (rouge, ambre, vert, bleu ou blanc) pour l'enseigne, les prix et l'action, cases éteintes dessinées en fantôme ; étal éclairé clair sous chaque photo pour garder les vraies couleurs des appareils ; Doto pour l'enseigne, Atkinson Hyperlegible Next pour tout le texte ; chiffres à segments dessinés en SVG ; la grille des modèles se lit aussi en tableau des prix.
STORY: on repère l'enseigne, on lit le tableau des prix, on s'arrête sur un appareil, on règle stockage, couleur et état, le prix se rallume, on commande.
FIRST VIEWPORT: le bandeau LED pleine largeur qui fait défiler le nom de la boutique, ses rayons et ses services ; dessous, à gauche l'appareil vedette sur l'étal éclairé, à droite le titre d'accueil en points LED, le nom du modèle et son prix en grands chiffres à segments, puis « Voir les appareils » en bouton allumé.
FORM: carte « choix d'Impeccable » (1 de ma liste), seed 3e54b890.
SIGNATURE: le bandeau défile (pause au survol, au focus et au bouton, immobile en mouvement réduit) ; changer un réglage éteint puis rallume les segments du prix d'un coup, les chiffres modifiés clignotent deux fois ; le compteur du panier est un afficheur à segments.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
