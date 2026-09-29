---
version: 1
slug: "apps-storefront-src-templates-patron"
primary_target: "apps/storefront/src/templates/patron"
related_targets: []
---

# Template « Le patron de couture » (id `patron`)

Scope: site public d'une boutique de mode (vêtements, chaussures, accessoires de mode) ; toutes les pages du site. Mode : Persuade (l'acheteur choisit et commande).
Audience : acheteuses et acheteurs de Dakar ou d'Abidjan, souvent au téléphone, qui connaissent la mercerie et le tailleur ; ils veulent la bonne taille et la bonne couleur du premier coup.
Job : repérer un modèle, voir ses déclinaisons, trouver sa taille dans le tableau des mesures, commander.
Constraints : palettes préréglées seulement, polices fixes, prix dans la devise de la boutique, WCAG AA, `prefers-reduced-motion`. Données réelles seulement : la référence du modèle est le SKU de la déclinaison, jamais un numéro inventé.

## Direction contract

THESIS: chaque article est un modèle de patron : une enveloppe à grand numéro de référence, ses couleurs en vues lettrées A, B, C, ses tailles dans le tableau des mesures du dos, et commander suit les étapes 1, 2, 3 de la notice ; refuse le lookbook blanc à grandes photos et la grille de place de marché.
OWN-WORLD: papier manille en fond, encre noire d'imprimerie, rouge de tracé réservé au choix en cours (vue, taille) et à rien d'autre ; tracés de coupe en pointillés avec ciseaux, crans et flèche de droit-fil ; grande grotesque large et lourde pour les numéros (Anybody), Franklin pour le texte (Libre Franklin), mesures en chiffres tabulaires ; trois encres par palette, tenues sur toute la page.
STORY: on reconnaît le modèle à son numéro, on compare ses vues, on trouve sa taille dans le tableau, on découpe le coupon : la commande part.
FIRST VIEWPORT: le recto de l'enveloppe du modèle vedette : bandeau d'éditeur au nom de la boutique, titre d'accueil en grande grotesque, la photo du modèle dans un cadre en pointillés avec flèche de droit-fil, ses vues A, B, C lettrées ; le coupon « Voir les modèles » à découper au coin bas droit.
FORM: 5 de ma liste (le patron de couture), carte du tirage, seed d8a3248c.
SIGNATURE: survoler une vue A, B ou C la montre sur la grande photo avant de l'engager ; « Ajouter au panier » découpe le coupon : les ciseaux parcourent le pointillé et le coupon se détache.
RAISES: encadré « Détail » qui agrandit le tissu de la photo (notice de montage) ; trois encres seulement (store de destination) ; rouge réservé au choix en cours (console à coudes) ; vue survolée montrée avant de l'engager (labo photo) ; matière et entretien épinglés sur la photo (coupe au soleil). La version rapide sur les cartes (blackbook) n'est pas construite : les cartes du catalogue ne portent pas les déclinaisons.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
