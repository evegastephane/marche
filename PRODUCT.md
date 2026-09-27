# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Imposée par le porteur du projet (voir `docs/ARCHITECTURE.md` §6) : dashboard en React + Vite (TanStack Router et Query, Tailwind CSS v4, shadcn/ui, Motion), sites des boutiques en Next.js, API NestJS. Authentification Clerk (une organisation Clerk = une boutique).

## Users

- **Marchands indépendants d'Afrique francophone, en priorité** (Sénégal, Côte d'Ivoire… boutiques en FCFA) : propriétaires de boutique et leurs collaborateurs (rôles propriétaire, admin, équipe). Ils gèrent leur boutique **autant sur téléphone que sur ordinateur** : l'ordinateur pour saisir le catalogue, le téléphone pour suivre et traiter les commandes, parfois avec une connexion lente.
- Des marchands en euros (France, Europe) utilisent le même produit ; ils ne sont pas la cible prioritaire.
- **Acheteurs** : clients finaux des sites générés, sans compte (checkout invité). Ils ne voient jamais le dashboard.

## Product Purpose

Un ERP e-commerce SaaS « à la Shopify » : le marchand gère ses marques, ses produits (avec variantes et images), son stock, ses catalogues et ses commandes, puis met en ligne une boutique web en un clic. Réussir, c'est qu'un marchand passe de l'inscription à une boutique en ligne qui reçoit des commandes, sans jamais vendre un article qu'il n'a plus.

## Positioning

Les données de l'ERP **sont** le site : « Générer mon site » publie immédiatement une boutique alimentée en direct par le catalogue et le stock, sans build ni déploiement. Les commandes du site retombent dans le même stock, réservé de façon atomique : pas de survente, même quand plusieurs clients commandent en même temps. Le paiement suit les usages locaux : la commande est « non payée » jusqu'à ce que le marchand la marque payée (paiement à la livraison, virement ; Mobile Money prévu en V2).

## Operating Context

- Devise choisie par boutique : FCFA (XOF, **sans décimales**) ou EUR (2 décimales). Montants toujours affichés dans la devise de la boutique.
- Interface en français.
- Commandes numérotées par boutique (#1001, #1002…). Statuts : brouillon → passée → expédiée, ou annulée ; paiement non payée → payée.
- Un marchand peut avoir plusieurs boutiques (sélecteur d'organisation Clerk).
- Chaque boutique a son sous-domaine `{slug}.<domaine>` (domaine de la plateforme non choisi).
- Données de démonstration (seed) : « Chez Awa » (Dakar, FCFA) et « Maison Lumière » (Paris, EUR).

## Capabilities and Constraints

- MVP : inscription et création de boutique, marques, produits et variantes, images, catalogues ordonnés, stock (ajustements, historique, alertes de stock bas), commandes (brouillon, passage, paiement manuel, expédition, annulation), clients créés à la commande, génération et personnalisation du site, tableau de bord (CA, commandes, ruptures).
- API existante et testée : `/api/v1` (admin, jeton Clerk) et `/storefront/v1` (sites). Les contrats Zod partagés sont dans `packages/contracts`.
- Hors MVP (V2) : paiement en ligne, domaines personnalisés, plusieurs templates, import CSV, promotions, comptes acheteurs.
- Non décidé : nom de domaine de la plateforme, tutoiement ou vouvoiement dans l'interface.

## Brand Commitments

- **Nom de marque : Upsell** (logo fourni le 2026-09-27). « Marché » n'est que le nom de code technique (dépôt, paquets `@marche/*`).
- **Logo** (`docs/brand/upsell-logo.jpg`) : chariot bleu dont la poignée monte en flèche, deux articles orange et jaune, roues orange ; wordmark « Upsell » en marine. Redessiné en SVG animable dans `apps/dashboard/src/shared/ui/brand.tsx` (copie dans `apps/storefront/src/components/upsell-mark.tsx`).
- **Palette** : bleu `#0B57F0` (action), marine `#0C1A3C` (encre), orange `#FF5A2B` et jaune `#FDB52A` (signaux). Thème clair et sombre sur le dashboard.
- **Typographie** : Plus Jakarta Sans.
- **Mouvement** : Motion (Framer Motion) fait partie du design : entrées qui montent comme la flèche du logo, ressorts amortis, transitions partagées (onglets, navigation), chiffres qui défilent, emblème qui se dessine. Jamais plus d'un tiers de seconde pour un changement d'état.

## Evidence on Hand

- Logo Upsell (JPEG, fond blanc) dans `docs/brand/`.
- Boutiques de démonstration du seed (données synthétiques).
- Aucun témoignage, client réel, chiffre d'usage, tarif ou partenariat : ne rien inventer de tel.

## Product Principles

1. **Le stock ne ment jamais** : ce que l'écran affiche comme disponible l'est vraiment.
2. **Du produit au site sans détour** : chaque écran rapproche le marchand d'une boutique en ligne qui vend.
3. **Aussi bon au téléphone qu'à l'ordinateur**, et sobre sur les connexions lentes.
4. **L'argent dans la devise du marchand**, exact, sans décimales inventées.

## Accessibility & Inclusion

WCAG AA sur le dashboard et le template par défaut ; `prefers-reduced-motion` respecté (docs/ARCHITECTURE.md §1.5). Usage mobile à égalité avec l'ordinateur : cibles tactiles confortables.
