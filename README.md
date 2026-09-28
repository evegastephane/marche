# marche

**Marché** : ERP e-commerce SaaS « à la Shopify ». Un marchand gère ses marques, produits, stock, catalogues et commandes, puis génère son site web en un clic.

- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Plan d'implémentation et avancement : [`docs/PLAN-CODE.md`](docs/PLAN-CODE.md)

## Stack

| Couche | Technologies |
|---|---|
| API et worker | NestJS 12, Prisma 7 (PostgreSQL 18), Redis 8, BullMQ, Clerk, PostHog |
| Dashboard marchand | React + Vite, TanStack Router et Query, Tailwind CSS v4, Radix, Motion, Clerk |
| Sites des boutiques | Next.js 16, multi-tenant par sous-domaine (template provisoire, en attente de la maquette) |
| Outillage | npm workspaces, Turborepo, Vitest, Testcontainers, oxlint, dependency-cruiser |

## Structure

```
apps/api            API NestJS (HTTP) + worker BullMQ, Dockerfile
apps/dashboard      dashboard marchand (http://localhost:5173)
apps/storefront     sites des boutiques ({slug}.localhost:3001)
packages/contracts  schémas Zod et types partagés front/back
packages/emails     templates d'e-mails transactionnels
packages/config     configurations TypeScript partagées
docs/               architecture et plan de code
```

## Démarrer en local

Prérequis : Node 26, npm 12 (`npm install -g npm@12`) et Docker Desktop.

```bash
npm install
npm run infra:up
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/storefront/.env.example apps/storefront/.env.local
npm run db:generate -w @marche/api
npm run db:migrate -w @marche/api
npm run db:seed -w @marche/api
npm run media:init -w @marche/api
```

Puis, dans deux terminaux :

```bash
npm run dev
```

```bash
npm run dev:worker -w @marche/api
```

`npm run dev` démarre l'API, le dashboard et le storefront. Le worker envoie les e-mails et rafraîchit les sites après chaque modification : sans lui, un site met jusqu'à 5 minutes à refléter un changement.

Le seed crée deux boutiques de démonstration (« Chez Awa » en XOF, « Maison Lumière » en EUR) avec leurs produits et leur site publié.

| Service | Adresse |
|---|---|
| Dashboard marchand | http://localhost:5173 |
| Site d'une boutique | http://{slug}.localhost:3001 (ex. http://chez-awa.localhost:3001) |
| API (Swagger sur `/docs`, files sur `/admin/queues`) | http://localhost:3000 |
| E-mails de dev (Mailpit) | http://localhost:8025 |
| PostgreSQL / Redis / S3 (RustFS) | ports 5434 / 6379 / 9000 |

`STOREFRONT_API_TOKEN` et `REVALIDATE_SECRET` doivent avoir la même valeur dans `apps/api/.env` et `apps/storefront/.env.local`.

### Clerk

L'API vérifie les jetons de session Clerk et crée une organisation Clerk par boutique. Il faut une application Clerk de développement avec les **Organizations** activées :

1. Installer la CLI et se connecter : `npm install -g clerk`, puis `clerk auth login`.
2. Renseigner `CLERK_SECRET_KEY` dans `apps/api/.env` : clé secrète de l'application de dev (Dashboard Clerk, *API keys*).

Les webhooks Clerk sont facultatifs en local : un utilisateur est créé à la volée lors de son premier appel à l'API. Pour les tester, la CLI relaie les événements vers l'API : `clerk webhooks listen --forward-to http://localhost:3000/webhooks/clerk`.

### Campagnes WhatsApp (facultatif)

La page **Campagnes** du dashboard envoie un produit sur WhatsApp aux clients qui ont coché « Recevoir les nouveautés sur WhatsApp » au paiement. L'envoi passe par l'API WhatsApp Cloud de Meta ; sans configuration, la page explique quoi renseigner.

1. Dans une app Meta (cas d'usage WhatsApp) : un numéro, un modèle de message **Marketing** en français approuvé, et un jeton permanent (utilisateur système). Le texte attendu du modèle est rappelé dans `apps/api/.env.example`.
2. Dans `apps/api/.env` : `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` pour l'envoi ; `WHATSAPP_WEBHOOK_VERIFY_TOKEN` et `WHATSAPP_APP_SECRET` pour le webhook. Redémarrer l'API et le worker (c'est le worker qui envoie).
3. Webhook (statuts délivré/lu, réponses « STOP ») : Meta exige une URL publique en https. En local, un tunnel `ngrok http 3000` suffit ; l'URL de rappel est `https://<domaine-ngrok>/webhooks/whatsapp`.

### Sites des boutiques

- Aperçu du brouillon : bouton **Aperçu** de la page Site (lien valable 30 minutes).
- `/sitemap.xml`, `/robots.txt` et `/confidentialite` sur chaque boutique ; `/confidentialite` sur le domaine racine pour la plateforme (adresse à donner à Meta).
- Mesure d'audience PostHog après consentement : renseigner `NEXT_PUBLIC_POSTHOG_KEY` dans `apps/storefront/.env.local` (sans clé, ni bandeau ni mesure).

## Vérifications

```bash
npx turbo run build lint typecheck test
```

```bash
npm run depcruise
```

```bash
npm run test:e2e
```

Les tests e2e démarrent leurs propres PostgreSQL et Redis avec Testcontainers : Docker doit tourner.

La CI (`.github/workflows/ci.yml`) lance ces vérifications sur chaque PR et sur `main`, plus `npm audit` et la construction des images Docker.

## Image Docker (API et worker)

Une seule image, deux commandes, construite depuis la racine du dépôt :

```bash
docker build -f apps/api/Dockerfile -t marche-api .
```

```bash
docker build -f apps/api/Dockerfile --target migrate -t marche-migrate .
```

- API : `docker run --env-file <fichier> -p 3000:3000 marche-api`
- Worker : `docker run --env-file <fichier> marche-api node dist/worker.js`
- Migrations, avant chaque déploiement : `docker run -e DATABASE_URL=<url> marche-migrate`

En production (`NODE_ENV=production`), l'API exige `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` et `EMAIL_PROVIDER=resend`.
