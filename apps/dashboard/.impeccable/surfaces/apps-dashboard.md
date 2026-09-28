---
version: 1
slug: "apps-dashboard"
primary_target: "apps/dashboard"
related_targets: ["apps/storefront"]
---

# Dashboard marchand Upsell

**Mode** : Operate. **Portée de ce lot** : connexion et inscription (Clerk), création de boutique, Accueil, Produits (liste, création avec variantes), Commandes (liste, détail, paiement, expédition, annulation), Site en un clic (génération, thème, publication). Même monde pour la page plateforme du storefront et le thème par défaut des boutiques. Le reste du dashboard (marques, catalogues, stock, clients, paramètres) viendra ensuite dans ce monde.

**Audience et tâche** : marchande ou marchand d'Afrique francophone, boutique en FCFA, au téléphone dans la boutique en journée pour suivre et traiter les commandes, à l'ordinateur le soir pour saisir le catalogue. Succès : voir en un coup d'œil ce qui est à faire (commandes à expédier, stock bas) et passer du produit au site en ligne sans détour.

**Réponses du 2026-09-27** : thème clair + sombre qui suit l'appareil (bascule manuelle possible) ; orange rare, « comme les roues » : seulement l'action principale de l'écran et ce qui demande l'attention ; mouvement fluide et précis ; portée : dashboard, page plateforme, thème par défaut des boutiques.

**Contraintes** : logo Upsell v2 (`docs/brand/upsell-logo.jpg` : chariot noir, deux roues orange) ; noir #101115, orange #F66B21, blanc ; montants dans la devise de la boutique (FCFA sans décimales) ; WCAG AA ; `prefers-reduced-motion` ; mobile et ordinateur à égalité.

## Direction contract

THESIS : Upsell est un instrument de précision, comme une calculatrice Braun : un boîtier net, des touches qui s'enfoncent, un afficheur de chiffres, et une seule touche orange par écran, celle de l'action à faire maintenant. Il refuse la grille de cartes du back-office générique et les graphiques décoratifs.

OWN-WORLD : boîtier blanc cassé (#F2F2EF) ou noir (#0C0C0E) selon l'appareil ; faces planes au filet fin ; champs en creux ; touches blanches à arête ombrée, touche noire pour l'emphase, une touche orange (#F66B21, légende noire) ; afficheur = écran à cristaux liquides gris clair enfoncé dans le boîtier en thème clair (fenêtre noire en thème sombre), chiffres fins en colonnes fixes qui roulent comme un compteur ; le noir plein reste rare en thème clair (décision du 2026-09-27 : « un peu sombre ») ; témoins lumineux : orange = demande ton attention, noir plein = allumé, anneau creux = éteint, rouge = erreur ; interrupteurs à glissière pour filtres, période et thème ; une linéale neutre à chiffres tabulaires.

STORY : le marchand allume son instrument, lit ses chiffres, voit la touche orange sur la prochaine commande à expédier, l'enfonce, et la lumière passe à la suivante ; son site en ligne est un témoin allumé.

FIRST VIEWPORT : Accueil. Panneau de commande à gauche (logo, boutique, touches de navigation, témoin orange sur Commandes s'il y a à expédier) ; en haut du contenu, le nom de la boutique et la fenêtre d'adresse du site avec son témoin ; dessous, l'afficheur pleine largeur : ventes sur la période (sélecteur 7 j / 30 j / 90 j), à expédier, stock bas ; puis la file « À expédier », touche orange sur la première commande, et à droite le stock bas. Au téléphone : l'afficheur en tête, la file dessous, rangée de touches en bas d'écran.

FORM : L'instrument (calculatrices et radios Braun, Dieter Rams), 1ʳᵉ de la liste ordonnée, choisie par l'utilisateur comme IMPECCABLE'S PICK, seed 9f4dffd8. Interaction signature : la touche orange est une seule lumière qui glisse vers la prochaine action quand une commande part ; les chiffres roulent en colonnes fixes ; l'emblème s'allume à l'arrivée (le chariot se trace, la flèche jaillit, les deux roues s'allument comme des témoins). Grammaire : un ressort sec pour les touches, un ressort de glissement pour les curseurs et la lumière, entrées courtes en cascade, rien au-delà de 0,4 s hors comptage.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Historique

- « Enseigne peinte » (Baobab, seed f3cc3c81) puis une première version Upsell colorée (bleu, marine, orange, jaune) : remplacées le 2026-09-27 par le logo v2 noir et orange.

## Décisions ouvertes

- Tutoiement ou vouvoiement (non tranché dans PRODUCT.md) : vouvoiement par défaut.
