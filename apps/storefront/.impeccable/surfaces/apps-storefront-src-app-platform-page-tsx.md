---
version: 1
slug: "apps-storefront-src-app-platform-page-tsx"
primary_target: "apps/storefront/src/app/(platform)/page.tsx"
related_targets: []
---

# Site vitrine Upsell (accueil de la plateforme)

Mode : Persuade (l'accueil). Le portail Développeurs (`/developers`) et la confidentialité gardent leur monde (« L'instrument ») ; ils ne sont pas refaits ici (choix de l'utilisateur, 2026-10-06).

- Visiteur : marchand indépendant, surtout en Afrique francophone, souvent au téléphone, qui veut vendre en ligne sans technicien.
- Action : « Créer ma boutique » (inscription puis ouverture de boutique, le nom tapé suit) ; « Se connecter » reste discret.
- Preuve : le produit lui-même, en répliques interactives fidèles au vrai dashboard (« L'instrument », thème clair) et au vrai site ; boutique d'exemple signalée comme telle. Aucun client, chiffre d'usage ni tarif inventé.
- Demandes de l'utilisateur (2026-10-06, seconde refonte du jour) : style inspiré des sites GSAP (sites primés à 50-100 k$), beaucoup d'animation, fonds animés, très peu de texte, captures du dashboard mises en avant et interactives, discussion WhatsApp interactive, site généré en un clic, factures. Produit seulement : aucun personnage ni histoire de clientes. Factures : le ticket de caisse existe ; la facture A4 est montrée avec l'étiquette « Bientôt ». Refonte totale : rien de la devanture de nuit (enseigne néon, rideau, faisceau) n'est gardé.
- Retouches demandées le 2026-10-06 (après la première version) : garder le fond animé tel quel ; ajouter des sections blanches compactes pour mieux montrer le produit ; alléger le téléphone (trop d'éléments) ; le ticket de caisse se télécharge une fois imprimé.
- Contraintes : marque Upsell (emblème, orange #F66B21, Hanken Grotesk) ; domaine lu dans `NEXT_PUBLIC_ROOT_DOMAIN` ; `prefers-reduced-motion` respecté ; aussi bon au téléphone, léger sur connexion lente (pas de WebGL).

## Direction contract

THESIS: le logo Upsell démonté sert de décor et de récit. Ses quatre pièces (panier, poignée-flèche, deux roues orange) roulent et montent pendant qu'on défile, puis se remontent en chariot à la fin. La page refuse l'arrangement habituel (accroche à gauche, capture encadrée à droite, grille de fonctions, FAQ) : le vrai produit occupe toute la scène et se manipule.

OWN-WORLD: scène noire #0E0F12, encre os #F4F2EE, gris #8E9097. Les pièces du logo sont les seules formes : panier et flèche en aplats sombres à peine levés du fond, roues en orange plein (la seule couleur vive, avec l'action principale). Hanken Grotesk très grasse, à cinq tailles franches. Répliques du dashboard nettes à l'échelle 1:1, coins 16 px, sans cadre de navigateur décoratif. Une ligne orange de 2 px (la poignée-flèche) traverse la page et se dessine au défilement. Deux chapitres (Publiez, Annoncez) sont des feuilles blanches posées sur la scène : elles s'élargissent en arrivant, le fil passe dessus et sous le produit. Au téléphone, seules les roues dépassent des bords ; panier et flèche n'entrent qu'à la fin.

STORY: le visiteur voit son dashboard dès le premier écran et peut le toucher. Il clique « Générer mon site » et regarde les produits du catalogue bâtir la boutique au téléphone ; il change de modèle et tape son nom. Il encaisse au comptoir, le ticket sort de l'imprimante et se télécharge ; la facture arrive bientôt. Il compose une campagne WhatsApp en choisissant ses réponses. À la fin, les pièces se remontent en chariot et il crée sa boutique.

FIRST VIEWPORT: en-tête fin (emblème et wordmark, « Se connecter », touche orange « Créer ma boutique »). Accroche géante centrée sur deux lignes, « Votre boutique. En un clic. », dont les deux points sont les roues orange qui arrivent en roulant. Une ligne de sous-titre, la touche orange et un lien discret. Dessous, le dashboard d'exemple (environ 1100 px de large), incliné en perspective, qui se redresse au défilement ; ses chiffres roulent et une commande y tombe. Les pièces géantes flottent derrière et s'écartent du pointeur. Au téléphone : même ordre, dashboard redressé et compacté.

FORM: « Le chariot en pièces », n° 7 de ma liste de sept (lecture littérale de gsap.com, assignée par le tirage), choisie par l'utilisateur ; seed d632a588. Interaction signature : une seule timeline pilotée par le défilement déplace les pièces de scène en scène (les roues tournent de la distance parcourue), le pointeur les pousse, chaque commande de la boutique d'exemple fait tourner les roues d'un cran, et le dernier écran les remonte en chariot. Grammaire de mouvement : entrées SplitText par lignes, redressement en perspective, Flip du catalogue vers le site, ligne orange tracée au défilement. Rehaussements : timeline unique réversible (automate), fond piloté par les événements (oscilloscope), réponse au pointeur (encre), ligne unique (pli), une seule famille en cinq tailles (spécimen).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
