---
version: 1
slug: 'apps-dashboard'
primary_target: 'apps/dashboard'
related_targets: []
---

# Dashboard marchand Upsell

> **2026-09-27 : direction remplacée.** La marque devient Upsell (voir PRODUCT.md, Brand Commitments) : design épuré clair/sombre, palette du logo, Plus Jakarta Sans, Motion intégré au langage visuel. Le contrat « Enseigne peinte » ci-dessous est historique.

**Mode** : Operate. **Portée de ce lot** : connexion et inscription (Clerk), création de boutique, Accueil, Produits (liste, création avec variantes), Commandes (liste, détail, paiement, expédition, annulation), Site en un clic (génération, thème, publication). Le reste du dashboard (marques, catalogues, stock, clients, paramètres) viendra ensuite dans le même monde.

**Audience et tâche** : marchande ou marchand d'Afrique francophone, boutique en FCFA, au téléphone dans la boutique en journée pour suivre et traiter les commandes, à l'ordinateur le soir pour saisir le catalogue. Succès : voir en un coup d'œil ce qui est à faire (commandes à expédier, stock bas) et passer du produit au site en ligne sans détour.

**Contraintes** : logo et vert Baobab imposés (`docs/brand/`, PRODUCT.md) ; montants dans la devise de la boutique (FCFA sans décimales) ; WCAG AA ; `prefers-reduced-motion` ; mobile et ordinateur à égalité.

## Direction contract

THESIS : le dashboard est la devanture peinte de la boutique, l'essentiel peint en grand et à plat, lisible de loin. Il refuse la grille de cartes grises du back-office générique.

OWN-WORLD : mur chaulé (#F2F3EC) sous une encre vert-noir ; panneaux peints à filet double ; vert Baobab (#034F32) en planche pleine pour la navigation et l'enseigne ; peintures de car rapide pour les états (jaune = à traiter, bleu = payé, rouge = annulé, vert = expédié) ; pictogrammes au trait blanc arrondi dans des pastilles vertes, comme l'emblème ; capitales Archivo très condensées pour titres et chiffres, Archivo droit pour l'interface. Chiffres à place fixe (levée de l'afficheur à segments).

STORY : le marchand reconnaît sa boutique en grand, voit ce qu'il doit faire aujourd'hui, le fait, et voit son site en ligne.

FIRST VIEWPORT : Accueil. Enseigne verte pleine largeur aux filets doubles : nom de la boutique en grandes capitales condensées, plaque d'adresse du site à droite (ou « Peindre mon site » s'il n'existe pas). Dessous, trois chiffres peints en cases fixes (CA 30 jours, à expédier, stock bas), puis la liste des commandes à expédier, action « Expédier » sur chaque ligne. Barre latérale verte à gauche (ordinateur), barre d'onglets en bas (téléphone).

FORM : enseignes peintes et cars rapides de Dakar, 5ᵉ de la liste ordonnée, seed f3cc3c81. Interaction signature : le coup de pinceau, chaque changement d'état se repeint d'un balayage de gauche à droite ; la création de boutique peint l'enseigne en direct pendant la saisie.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Décisions ouvertes

- Aperçu visuel du site dans l'éditeur de thème : le storefront Next.js n'existe pas encore.
- Tutoiement ou vouvoiement (non tranché dans PRODUCT.md) : vouvoiement par défaut dans ce lot.
