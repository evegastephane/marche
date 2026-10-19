---
version: 1
slug: "apps-dashboard-src-routes-app-templates-tsx"
primary_target: "apps/dashboard/src/routes/_app/templates.tsx"
related_targets: []
---

# Page Modèles du dashboard Upsell

**Mode** : Operate. **Portée** : la page `/templates` (galerie) et l'essai plein écran `/templates/$templateId`.

**Audience et tâche** : le marchand choisit l'habillage de son site parmi un catalogue appelé à dépasser 1000 modèles. Il ne voit que les modèles de son type de boutique (téléphonie ou couture), filtre par secteur et par style, cherche, parcourt les sélections d'Upsell, puis essaie un modèle en plein écran sur sa vraie boutique avant de l'utiliser (ou de passer à Premium).

**Réponses du 2026-10-19** : modèles réservés au type de la boutique ; secteur, style, recherche et sélections ; vignette = capture fournie avec chaque modèle ; essai en plein écran.

## Direction contract

THESIS : les modèles se parcourent comme les rayons d'une boutique, des sélections qui défilent, et la grille seulement quand on cherche ou filtre. La page refuse la grille infinie indifférenciée et le panneau côte à côte qui étouffe la galerie.

OWN-WORLD : « L'instrument » : boîtier, faces au filet, rails en creux qui portent chaque rayon, captures 16:10 posées comme des écrans cerclés d'un filet, témoin plein « Le vôtre », cadenas en petite touche pour Premium, légendes sérigraphiées pour les rayons, une seule touche orange : Utiliser ce modèle ou Passer à Premium, dans l'essai.

STORY : le marchand voit son modèle actuel, puis « Pour votre boutique », « Nouveautés », « Gratuits » et un rayon par style, tous à son type de boutique. Il fait défiler, ouvre une capture : elle grandit en plein écran sur sa boutique, il choisit sa palette, puis l'utilise ou passe à Premium.

FIRST VIEWPORT : titre et sous-titre ; face « Votre modèle » (capture à gauche, nom, palette, Personnaliser) ; à droite la recherche et la formule ; le premier rayon commence sous la face, quatre captures et la touche suivante ; au téléphone une capture et demie par rayon.

FORM : Rayons de sélections, 3ᵉ de la liste ordonnée, tiré en tête (seed 05da10f2). Interaction signature : la capture choisie grandit jusqu'à l'essai plein écran (transition de mise en page partagée), les rayons glissent cran par cran.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
