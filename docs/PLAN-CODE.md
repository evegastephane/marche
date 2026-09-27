# Marché : plan de code

> Plan d'implémentation détaillé, phase par phase, de ce que décrit [`ARCHITECTURE.md`](./ARCHITECTURE.md).
>
> **Version** : 0.1 · **Date** : 2026-09-27 · **Statut** : prêt à exécuter à partir de la phase 0.

## Sommaire
0. [Mode d'emploi](#0-mode-demploi)
1. [Versions de référence](#1-versions-de-référence)
2. [Conventions de code](#2-conventions-de-code)
3. [Arborescence cible](#3-arborescence-cible)
4. [Environnement local et variables](#4-environnement-local-et-variables)
5. [Schéma de données complet (Prisma)](#5-schéma-de-données-complet-prisma)
6. [Socle technique : squelettes de code clés](#6-socle-technique--squelettes-de-code-clés)
7. [Phases de réalisation](#7-phases-de-réalisation)
8. [Stratégie de tests](#8-stratégie-de-tests)
9. [CI/CD et déploiement](#9-cicd-et-déploiement)
10. [Estimation et jalons](#10-estimation-et-jalons)
11. [Prérequis externes et décisions ouvertes](#11-prérequis-externes-et-décisions-ouvertes)
12. [Risques et parades](#12-risques-et-parades)

---

## 0. Mode d'emploi

- Chaque tâche porte un identifiant `Px-yy`. **Une tâche = une PR** (ou un commit atomique), sauf mention contraire.
- Chaque phase se termine par une **Definition of Done (DoD)** vérifiable. On ne commence pas la phase suivante tant qu'elle n'est pas remplie.
- Les cases `- [ ]` servent au suivi : on les coche dans la PR qui livre la tâche.
- Les numéros entre crochets renvoient au document d'architecture : `[UC-31]`, `[R5]`, `[§4.4]`.

### 0.1 Hypothèses retenues par défaut
Les hypothèses du §1.4 de l'architecture s'appliquent tant qu'elles ne sont pas contredites :
- **SaaS multi-tenant** : 1 organisation Clerk = 1 boutique.
- **Pas de paiement en ligne** : le marchand marque la commande payée.
- **Un seul stock** par boutique.
- **Checkout invité** (sans compte acheteur).
- **Sous-domaines** `{slug}.<domaine>`. En local, on utilise `{slug}.localhost:3001`, que les navigateurs résolvent tout seuls.
- **Une devise par boutique.** Les prix des variantes sont exprimés dans la devise de la boutique.

### 0.2 Ajustements par rapport à `ARCHITECTURE.md`
Les versions publiées ont été vérifiées le 2026-09-27, ce qui entraîne les ajustements suivants :

| Sujet | Architecture | Plan de code | Raison |
|---|---|---|---|
| Validation Nest | `nestjs-zod` | **Pipe Zod maison** (≈30 lignes) + `z.toJSONSchema()` pour Swagger | `nestjs-zod@5.5` n'accepte en peer que Nest 10/11 et Swagger ≤ 11. Nous sommes en Nest 12 |
| Prisma | « Prisma 7 » | **Épingler `7.10.0`** (prisma, @prisma/client, @prisma/adapter-pg) | Le tag npm `latest` de `prisma` pointe sur `8.0.0-rc.17`. Un `npm i prisma` sans version installerait une RC |
| TypeScript | – | **Rester en 6.x** (celle du scaffold) | TS 7.0 est sorti, mais `@nestjs/swagger@12` n'accepte que `^5.5 \|\| ^6` |
| Stockage objet local | MinIO | **RustFS** (compatible S3) | L'image `minio/minio` n'est plus publiée sur Docker Hub |
| Files BullMQ | 5 files | **+ file `analytics`** | Isoler les envois PostHog côté serveur, avec leurs propres retries |
| Site | `themeSettings` | **+ `draftThemeSettings`** | L'éditeur de thème travaille sur un brouillon. « Publier » le copie vers le thème en ligne, comme Shopify |
| Tableaux | TanStack Table | **v8 (`8.21.x`)** | La v9 vient de sortir, alors que les exemples shadcn (data-table) sont en v8 |
| Gestionnaire de paquets | pnpm workspaces | **npm workspaces** (npm 12, livré avec Node 26) | Choix du porteur du projet (2026-09-27) : aucun outil supplémentaire à installer |
| `@nestjs/mau` | – | **Retiré** | Outil de déploiement propriétaire de Nest, inutilisé ; il apportait 5 vulnérabilités (`npm audit`) |

---

## 1. Versions de référence

Ce tableau est **la référence des versions**. npm n'a pas d'équivalent du « catalog » de pnpm. On applique donc ces règles :
- **Outils partagés** (TypeScript, Vitest et sa couverture, oxlint + oxlint-tsgolint, Prettier, Turbo, `@types/node`) : déclarés **une seule fois**, dans le `package.json` racine. Les workspaces les utilisent grâce au hissage (hoisting) npm.
- **Dépendances d'exécution** (zod, Nest, Prisma, React…) : déclarées dans le `package.json` du workspace qui les utilise, **avec la plage de ce tableau**. Si plusieurs workspaces en dépendent, la plage est identique partout ; on le vérifie avec `npm ls <paquet>` (une seule version attendue).
- **Paquets internes** : référencés par `"*"` (par exemple `"@marche/contracts": "*"`). npm ne connaît pas le protocole `workspace:`.
- **Versions exactes** quand c'est nécessaire, sans `^` (Prisma).

| Domaine | Paquets | Version |
|---|---|---|
| Runtime | Node | 26.x (`.nvmrc`) |
| Gestionnaire | npm (workspaces) / Turborepo | 12 / 2.11 |
| Langage | TypeScript | ^6.0.2 |
| Back | @nestjs/common, core, platform-express, testing, config, swagger, event-emitter, terminus, bullmq | ^12 |
| Back | nestjs-cls / @nestjs-cls/transactional / adapter-prisma | ^7.0 / ^4.0 / ^2.0 |
| Back | @nestjs/throttler / nestjs-pino (+ pino ^10, pino-http ^11) | ^6.7 / ^5.2 |
| BD | prisma, @prisma/client, @prisma/adapter-pg | **7.10.0** (exact) |
| Files | bullmq / @bull-board/nestjs + api + express | ^6.3 / ^9.10 |
| Redis | ioredis | ^6.0 |
| Validation | zod | ^4.6 |
| Auth | @clerk/backend / @clerk/react / @clerk/testing / svix | ^3.20 / ^6.17 / ^2.2 / ^2.5 |
| Analytics | posthog-node / posthog-js | ^5.54 / ^1.434 |
| Médias | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner / sharp | ^3.1141 / ^0.35 |
| E-mail | @react-email/components / resend / nodemailer (dev) | ^1.0 / ^6.30 / ^10.0 |
| Jetons | jose (preview, signatures) / uuid (v7) | ^6.2 / ^14.0 |
| Front | react, react-dom | ^19.3 |
| Dashboard | vite / @vitejs/plugin-react | ^8.3 / ^6.1 |
| Dashboard | @tanstack/react-router + router-plugin / react-query / react-table | ^1.170 / ^5.104 / **^8.21** |
| Dashboard | react-hook-form / zustand / @dnd-kit/core + sortable / recharts | ^7.89 / ^5.0 / ^6.3 + ^10.0 / ^3.10 |
| Storefront | next | ^16.3 |
| UI | tailwindcss + @tailwindcss/vite / shadcn (CLI) / motion / lucide-react / sonner | ^4.3 / ^4.21 / ^13.4 / ^1.48 / ^2.0 |
| Tests | vitest (déjà en place) / @testing-library/react / testcontainers (+ postgresql, redis) / @playwright/test / supertest | ^4.1 / ^16.3 / ^12.1 / ^1.63 / ^7.0 |
| Qualité | oxlint (+ oxlint-tsgolint) / prettier / dependency-cruiser | ^1.58 / ^3.4 / ^18.4 |
| Outils | tsx / dotenv | ^4.23 / ^18.0 |

Extrait du `package.json` racine :
```json
{
  "packageManager": "npm@12.0.1",
  "workspaces": ["packages/*", "apps/*"],
  "devDependencies": {
    "@types/node": "^26.6.3",
    "@vitest/coverage-v8": "^4.1.11",
    "oxlint": "^1.58.0",
    "oxlint-tsgolint": "^7.0.2001",
    "prettier": "^3.4.2",
    "turbo": "^2.11.4",
    "typescript": "^6.0.2",
    "vitest": "^4.1.11"
  }
}
```
Commandes utiles :
- ajouter une dépendance à un workspace : `npm i zod@^4.6.5 -w @marche/contracts` ;
- lancer un script d'un workspace : `npm run db:migrate -w @marche/api`.

---

## 2. Conventions de code

### 2.1 Nommage des fichiers (back)
| Élément | Suffixe | Exemple |
|---|---|---|
| Agrégat | `.aggregate.ts` | `product.aggregate.ts` |
| Entité interne | `.entity.ts` | `product-variant.entity.ts` |
| Value Object | `.vo.ts` | `sku.vo.ts`, `money.vo.ts` |
| Événement de domaine | `.event.ts` | `product-published.event.ts` |
| Erreur métier | `.errors.ts` | `catalog.errors.ts` |
| Port (interface) | `.port.ts` / `.repository.ts` | `storage.port.ts`, `product.repository.ts` |
| Use case (écriture) | `.use-case.ts` | `create-product.use-case.ts` |
| Query (lecture) | `.query.ts` | `list-products.query.ts` |
| Adapter Prisma | `prisma-*.repository.ts` | `prisma-product.repository.ts` |
| Mapper | `.mapper.ts` | `product.mapper.ts` |
| Controller | `.controller.ts` | `admin-products.controller.ts`, `storefront-products.controller.ts` |
| Processor BullMQ | `.processor.ts` | `order-emails.processor.ts` |
| Façade | `<module>.facade.ts` | `inventory.facade.ts` |
| Tests | `.spec.ts` (unitaire), `.int-spec.ts` (intégration), `.e2e-spec.ts` (API) | `order.aggregate.spec.ts` |

### 2.2 Règles de code
- **Nommage** : le code est en anglais, l'UI et la documentation en français.
- **ESM strict (back)** :
  - imports relatifs avec l'extension `.js` (`nodenext`) ;
  - pas d'alias de chemins dans l'API, pour éviter les pièges ESM + tsc.
- **Classes abstraites comme jetons DI** des ports : `{ provide: StoragePort, useClass: S3StorageAdapter }`.
- **Aucun import transverse** vers `modules/<autre>/(domain|application|infrastructure|interface)`. On passe uniquement par `<autre>.facade.ts` ou par les événements. `dependency-cruiser` le vérifie (§9).
- **Pas de `any`.** `unknown` + Zod aux frontières.
- **Montants** : `number` entier en **unités mineures**, jamais de flottant. Formatage uniquement à l'affichage (`Intl.NumberFormat`).
- **Dates** : `Date` UTC côté back, ISO 8601 dans les contrats.
- **Relations Prisma entre modules** : les clés étrangères entre tables de modules différents existent pour l'intégrité. En revanche, un repository **ne fait jamais** d'`include` vers une table d'un autre module.
- **SQL brut** (`$queryRaw`, `$executeRaw`) : `store_id` est **toujours** filtré explicitement, car l'extension tenant ne couvre pas le SQL brut. C'est un point de la checklist de revue.

### 2.3 Événements de domaine
- **Type** : `<module>.<agrégat>.<verbe-au-passé>`, par exemple `catalog.product.published`, `orders.order.placed`, `inventory.stock.low`.
- **Enveloppe** : `{ id (uuidv7), type, storeId, aggregateId, occurredAt, payload }`.
- **Payload** : minimal et **auto-suffisant** (ce dont les abonnés ont besoin), versionné en ajoutant des champs, jamais en les renommant.

### 2.4 Erreurs (codes métier stables, renvoyés dans `problem+json`)
| Code | HTTP | Origine |
|---|---|---|
| `VALIDATION_FAILED` | 422 | Pipe Zod, invariants simples |
| `NOT_FOUND` | 404 | Ressource absente, ou appartenant à une autre boutique |
| `UNIQUE_VIOLATION` (`SKU_TAKEN`, `SLUG_TAKEN`, `STORE_SLUG_TAKEN`) | 409 | Unicité par boutique [R1] |
| `CONCURRENT_MODIFICATION` | 409 | Verrou optimiste (`version`) |
| `PRODUCT_NOT_PUBLISHABLE` | 422 | [R3] |
| `INSUFFICIENT_STOCK` | 409 | Réservation [R4, R5] (détail par variante) |
| `STOCK_BELOW_RESERVED` | 409 | Ajustement qui rendrait enMain < réservé |
| `INVALID_ORDER_TRANSITION` | 409 | Machine à états [R7] |
| `CART_CHANGED` (`PRICE_CHANGED`, `ITEM_UNAVAILABLE`) | 409 | Chaîne de validation du checkout |
| `IDEMPOTENCY_IN_PROGRESS` | 409 | Requête identique en cours |
| `STORE_REQUIRED` | 403 | Pas d'organisation active dans le jeton |
| `FORBIDDEN` | 403 | Rôle insuffisant |

### 2.5 Git et PR
- **Dépôt** : un seul dépôt git à la racine `Marche/` (le `.git` de `backend/` n'a aucun commit, on le remplace).
- **Branches** : `main` protégée, branches courtes `feat/P1-05-create-product`, `fix/…`, `chore/…`.
- **Commits** : **Conventional Commits** (`feat(catalog): create product use case`).
- **Checklist de PR** :
  - la tâche est cochée ;
  - les tests sont ajoutés ;
  - le SQL brut filtre `store_id` ;
  - pas d'import transverse ;
  - les contrats Zod sont mis à jour dans `packages/contracts` ;
  - les écrans ont des états chargement, vide et erreur ;
  - les textes UI sont en français.

---

## 3. Arborescence cible

```
Marche/
├─ package.json                 # workspaces npm, scripts racine (turbo), outils partagés
├─ package-lock.json
├─ turbo.json
├─ docker-compose.yml
├─ .nvmrc · .editorconfig · .gitignore · .prettierrc · .oxlintrc.json
├─ .dependency-cruiser.cjs
├─ .github/workflows/ci.yml · deploy.yml
├─ docs/ ARCHITECTURE.md · PLAN-CODE.md · adr/
├─ packages/
│  ├─ config/                   # tsconfig.base.json, tsconfig.nest.json, tsconfig.react.json
│  ├─ contracts/                # Zod + types partagés (compilé par tsc → dist/)
│  │  └─ src/ common.ts (money, pagination, problem) · stores.ts · catalog.ts · inventory.ts
│  │           orders.ts · checkout.ts · sites.ts · reporting.ts
│  │           templates/ default.ts (settingsSchema + defaultSettings, sans React) · index.ts
│  ├─ ui/                       # shadcn/ui partagé : components/, lib/utils.ts, styles/globals.css (tokens Tailwind v4)
│  └─ emails/                   # templates React Email (order-confirmation, merchant-new-order, low-stock)
├─ apps/
│  ├─ api/                      # NestJS (ancien backend/)
│  │  ├─ prisma.config.ts
│  │  ├─ prisma/ schema.prisma · migrations/ · seed.ts
│  │  ├─ Dockerfile
│  │  └─ src/
│  │     ├─ main.ts             # HTTP
│  │     ├─ worker.ts           # BullMQ
│  │     ├─ app.module.ts       # modules + controllers (HTTP)
│  │     ├─ worker.module.ts    # modules + processors (worker)
│  │     ├─ generated/prisma/   # client Prisma généré (gitignoré)
│  │     ├─ shared/
│  │     │  ├─ domain/          # aggregate-root.ts, entity.ts, value-object.ts, domain-event.ts,
│  │     │  │                   # domain-error.ts, money.vo.ts, currency.ts, slug.vo.ts, email.vo.ts, id.ts
│  │     │  ├─ application/     # clock.port.ts, outbox.port.ts, use-case.ts
│  │     │  └─ infrastructure/
│  │     │     ├─ config/       # env.schema.ts, config.module.ts
│  │     │     ├─ prisma/       # prisma.provider.ts, tenant-scope.extension.ts, prisma.module.ts
│  │     │     ├─ cls/          # tenant-context.ts, cls.module.ts
│  │     │     ├─ http/         # problem-details.filter.ts, zod.pipe.ts, zod.decorators.ts,
│  │     │     │                # idempotency.interceptor.ts, decorators (public, roles, no-store)
│  │     │     ├─ redis/        # redis.module.ts
│  │     │     ├─ queue/        # queues.ts (noms), queue.module.ts, tenant-job.processor.ts
│  │     │     ├─ outbox/       # prisma-outbox.repository.ts, outbox-relay.processor.ts, event-routes.ts
│  │     │     ├─ logging/      # logger.module.ts (pino)
│  │     │     └─ health/       # health.controller.ts
│  │     └─ modules/
│  │        ├─ identity/        # clerk-auth.guard.ts, tenant.guard.ts, roles.guard.ts, clerk-webhooks.controller.ts, users…
│  │        ├─ stores/
│  │        ├─ catalog/         # ↓ gabarit détaillé
│  │        │  ├─ domain/ brand.aggregate.ts · product.aggregate.ts · product-variant.entity.ts
│  │        │  │          collection.aggregate.ts · sku.vo.ts · product-status.ts · events/ · catalog.errors.ts
│  │        │  │          brand.repository.ts · product.repository.ts · collection.repository.ts
│  │        │  ├─ application/ commands/*.use-case.ts · queries/*.query.ts
│  │        │  ├─ infrastructure/ persistence/prisma-*.repository.ts · mappers/*.mapper.ts
│  │        │  ├─ interface/ http/admin-*.controller.ts · http/storefront-*.controller.ts
│  │        │  ├─ catalog.facade.ts
│  │        │  └─ catalog.module.ts
│  │        ├─ media/  inventory/  orders/  checkout/  sites/
│  │        ├─ notifications/  analytics/  reporting/
│  ├─ dashboard/                # React + Vite
│  │  ├─ vite.config.ts · index.html · components.json (shadcn)
│  │  └─ src/
│  │     ├─ main.tsx · app/ providers.tsx · router.tsx
│  │     ├─ routes/             # TanStack Router, routes fichiers (voir P0-15)
│  │     ├─ features/<feature>/ api/ (hooks Query) · components/ · schemas.ts
│  │     └─ shared/ api/ client.ts · query-keys.ts · hooks/ · lib/ format.ts (Money, dates)
│  └─ storefront/               # Next.js
│     ├─ next.config.ts · src/proxy.ts
│     └─ src/
│        ├─ app/ page.tsx (domaine racine) · s/[site]/{layout,page,not-found}.tsx
│        │      s/[site]/products/[slug]/page.tsx · collections/[slug]/page.tsx · collections/page.tsx
│        │      s/[site]/cart/page.tsx · checkout/page.tsx · orders/[token]/page.tsx · preview/page.tsx
│        │      s/[site]/sitemap.ts · s/[site]/robots.txt/route.ts · api/revalidate/route.ts (hors s/)
│        ├─ templates/ index.ts (registre) · types.ts · default/ sections/*.tsx · components/*.tsx
│        ├─ actions/ cart.ts · checkout.ts   # Server Actions
│        └─ lib/ storefront-api.ts (server-only, 'use cache') · env.ts · analytics.tsx · consent.tsx
```

---

## 4. Environnement local et variables

### 4.1 Démarrage (une fois la phase 0 livrée)
```bash
npm run infra:up
```
```bash
npm install
```
```bash
npm run db:migrate -w @marche/api
```
```bash
npm run db:seed -w @marche/api
```
```bash
npm run dev
```

Scripts de `apps/api/package.json` :
- `db:migrate` : `prisma migrate dev`
- `db:generate` : `prisma generate`
- `db:seed` : `prisma db seed`
- `db:studio` : `prisma studio`
- `media:init` : création du bucket et de sa politique de lecture publique en dev
- `dev` : `nest start --watch`
- `dev:worker` : `nest start --watch --entryFile worker`. Le build (`tsconfig.build.json`, `rootDir: ./src`) produit `dist/main.js` et `dist/worker.js`.

### 4.2 `docker-compose.yml`
```yaml
name: marche
services:
  postgres:
    image: postgres:18-alpine
    environment: { POSTGRES_USER: marche, POSTGRES_PASSWORD: marche, POSTGRES_DB: marche }
    ports: ["5434:5432"]         # 5432 et 5433 sont déjà pris sur le poste de dev
    volumes: ["pgdata:/var/lib/postgresql"]   # PG 18 : point de montage /var/lib/postgresql
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U marche"], interval: 5s, retries: 10 }
  redis:
    image: redis:8-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory-policy", "noeviction"]
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]
  s3:
    image: rustfs/rustfs:1.0.0                # compatible S3 ; identifiants par défaut rustfsadmin / rustfsadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: ["s3data:/data"]
  mailpit:
    image: axllent/mailpit:v1.31
    ports: ["8025:8025", "1025:1025"]         # UI http://localhost:8025, SMTP :1025
volumes: { pgdata: {}, redisdata: {}, s3data: {} }
```

### 4.3 Variables d'environnement
Chaque app a un `.env.example` versionné. Les `.env` restent hors git. L'API **valide** ses variables au démarrage avec Zod (`env.schema.ts`) et refuse de démarrer si l'une d'elles est invalide.

**`apps/api/.env`**
| Variable | Exemple local | Rôle |
|---|---|---|
| `NODE_ENV` / `PORT` | `development` / `3000` | |
| `DATABASE_URL` | `postgresql://marche:marche@localhost:5434/marche` | Prisma |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ, cache, paniers |
| `CLERK_SECRET_KEY` | `sk_test_…` | Backend API Clerk |
| `CLERK_JWT_KEY` | *(optionnel)* PEM | Vérification JWT sans réseau |
| `CLERK_AUTHORIZED_PARTIES` | `http://localhost:5173` | `azp` autorisés |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_…` | Signature svix |
| `CORS_ORIGINS` | `http://localhost:5173` | Liste blanche |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | `http://localhost:9000` / `auto` / `marche-media` | Stockage |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `rustfsadmin` / `rustfsadmin` | |
| `MEDIA_PUBLIC_BASE_URL` | `http://localhost:9000/marche-media` | URL publique des images |
| `EMAIL_PROVIDER` | `smtp` (dev) / `resend` (prod) | Stratégie d'envoi |
| `SMTP_URL` / `RESEND_API_KEY` / `EMAIL_FROM` | `smtp://localhost:1025` / – / `Marché <no-reply@…>` | |
| `POSTHOG_API_KEY` / `POSTHOG_HOST` | `phc_…` / `https://eu.i.posthog.com` | Analytics serveur (optionnel en dev) |
| `STOREFRONT_API_TOKEN` | chaîne aléatoire de 32 octets | Secret partagé storefront → API |
| `STOREFRONT_INTERNAL_URL` | `http://localhost:3001` | Appels de revalidation par le worker |
| `REVALIDATE_SECRET` / `PREVIEW_TOKEN_SECRET` | chaînes aléatoires | Revalidation / aperçu du thème |
| `PLATFORM_ROOT_DOMAIN` / `SITE_URL_SCHEME` | `localhost:3001` / `http` | Construction des URL de site |
| `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` | `admin` / `admin` | Accès à `/admin/queues` |
| `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | *(optionnel)* | `@nestjs/observe` activé seulement si présent |

**`apps/dashboard/.env`** :
- `VITE_API_URL=http://localhost:3000`
- `VITE_CLERK_PUBLISHABLE_KEY=pk_test_…`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_PLATFORM_ROOT_DOMAIN=localhost:3001`
- `VITE_SITE_URL_SCHEME=http`

**`apps/storefront/.env`** :
- `API_INTERNAL_URL=http://localhost:3000`
- `STOREFRONT_API_TOKEN`
- `REVALIDATE_SECRET`
- `PREVIEW_TOKEN_SECRET`
- `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3001`
- `NEXT_PUBLIC_MEDIA_BASE_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

### 4.4 Ports
| Service | Port |
|---|---|
| API (+ `/docs` Swagger, `/admin/queues` Bull Board) | 3000 |
| Storefront (`{slug}.localhost:3001`) | 3001 |
| Dashboard | 5173 |
| PostgreSQL / Redis | 5434 (5432 dans le conteneur) / 6379 |
| RustFS (S3 / console) | 9000 / 9001 |
| Mailpit (UI / SMTP) | 8025 / 1025 |

---

## 5. Schéma de données complet (Prisma)

`apps/api/prisma.config.ts` :
```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});
```

`apps/api/prisma/schema.prisma` : schéma **cible**. Chaque phase migre sa partie (§5.2).
```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "js"          // imports compatibles "nodenext"
}

datasource db {
  provider = "postgresql"             // l'URL est dans prisma.config.ts (Prisma 7)
}

// ───────────── Enums ─────────────
enum MemberRole {
  OWNER
  ADMIN
  STAFF
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum MediaStatus {
  PENDING
  READY
  FAILED
}

enum StockMovementType {
  INITIAL
  RECEIPT
  ADJUSTMENT
  LOSS
  SALE
  RETURN
}

enum OrderStatus {
  DRAFT
  PLACED
  FULFILLED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}

enum OrderSource {
  ADMIN
  STOREFRONT
}

enum SiteStatus {
  DRAFT
  PUBLISHED
  UNPUBLISHED
}

// ───────────── identity / stores ─────────────
model User {
  id          String        @id @default(uuid(7)) @db.Uuid
  clerkUserId String        @unique @map("clerk_user_id")
  email       String
  firstName   String?       @map("first_name")
  lastName    String?       @map("last_name")
  imageUrl    String?       @map("image_url")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")
  memberships StoreMember[]
  @@map("users")
}

model Store {
  id               String   @id @default(uuid(7)) @db.Uuid
  clerkOrgId       String   @unique @map("clerk_org_id")
  name             String
  slug             String   @unique                 // = sous-domaine
  currency         String   @db.Char(3)             // ISO 4217
  country          String   @db.Char(2)             // ISO 3166-1
  timezone         String   @default("Europe/Paris")
  contactEmail     String?  @map("contact_email")
  phone            String?
  logoMediaId      String?  @map("logo_media_id") @db.Uuid
  shippingSettings Json     @default("{\"strategy\":\"FLAT_RATE\",\"flatRateAmount\":0}") @map("shipping_settings")
  lowStockDefault  Int      @default(5) @map("low_stock_default")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  archivedAt       DateTime? @map("archived_at")

  members     StoreMember[]
  counter     StoreCounter?
  brands      Brand[]
  products    Product[]
  variants    ProductVariant[]
  media       Media[]
  collections Collection[]
  customers   Customer[]
  orders      Order[]
  site        Site?
  @@map("stores")
}

model StoreMember {
  storeId   String     @map("store_id") @db.Uuid
  userId    String     @map("user_id") @db.Uuid
  role      MemberRole
  createdAt DateTime   @default(now()) @map("created_at")
  store     Store      @relation(fields: [storeId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([storeId, userId])
  @@index([userId])
  @@map("store_members")
}

model StoreCounter {
  storeId  String @id @map("store_id") @db.Uuid
  orderSeq Int    @default(1000) @map("order_seq")   // 1re commande = #1001
  store    Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  @@map("store_counters")
}

// ───────────── catalog ─────────────
model Brand {
  id          String    @id @default(uuid(7)) @db.Uuid
  storeId     String    @map("store_id") @db.Uuid
  name        String
  slug        String
  description String?
  logoMediaId String?   @map("logo_media_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  archivedAt  DateTime? @map("archived_at")
  store       Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products    Product[]
  @@unique([storeId, slug])
  @@index([storeId, name])
  @@map("brands")
}

model Product {
  id             String        @id @default(uuid(7)) @db.Uuid
  storeId        String        @map("store_id") @db.Uuid
  brandId        String?       @map("brand_id") @db.Uuid
  title          String
  slug           String
  description    String?                          // Markdown
  status         ProductStatus @default(DRAFT)
  options        Json          @default("[]")     // [{ "name": "Taille", "values": ["S","M"] }]
  seoTitle       String?       @map("seo_title")
  seoDescription String?       @map("seo_description")
  publishedAt    DateTime?     @map("published_at")
  version        Int           @default(0)
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  archivedAt     DateTime?     @map("archived_at")
  store          Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  brand          Brand?        @relation(fields: [brandId], references: [id], onDelete: SetNull)
  variants       ProductVariant[]
  media          ProductMedia[]
  collections    CollectionProduct[]
  @@unique([storeId, slug])
  @@index([storeId, status, updatedAt(sort: Desc)])
  @@index([storeId, brandId])
  @@map("products")
}

model ProductVariant {
  id              String    @id @default(uuid(7)) @db.Uuid
  storeId         String    @map("store_id") @db.Uuid
  productId       String    @map("product_id") @db.Uuid
  sku             String
  title           String                              // "M / Rouge" ou "Par défaut"
  optionValues    Json      @default("[]") @map("option_values")   // ["M","Rouge"]
  priceAmount     Int       @map("price_amount")      // unités mineures, devise de la boutique
  compareAtAmount Int?      @map("compare_at_amount")
  position        Int       @default(0)
  trackInventory  Boolean   @default(true) @map("track_inventory")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  archivedAt      DateTime? @map("archived_at")
  store           Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventory       InventoryLevel?
  movements       StockMovement[]
  orderLines      OrderLine[]
  @@unique([storeId, sku])
  @@index([productId, position])
  @@map("product_variants")
}

model Media {
  id        String      @id @default(uuid(7)) @db.Uuid
  storeId   String      @map("store_id") @db.Uuid
  key       String      @unique                     // clé d'objet S3 : {storeId}/{mediaId}/original.{ext}
  mimeType  String      @map("mime_type")
  sizeBytes Int         @map("size_bytes")
  width     Int?
  height    Int?
  alt       String?
  status    MediaStatus @default(PENDING)
  renditions Json       @default("{}")              // { "400": "…webp", "800": "…", "1600": "…" }
  createdAt DateTime    @default(now()) @map("created_at")
  store     Store       @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products  ProductMedia[]
  @@index([storeId, createdAt(sort: Desc)])
  @@map("media")
}

model ProductMedia {
  storeId   String  @map("store_id") @db.Uuid
  productId String  @map("product_id") @db.Uuid
  mediaId   String  @map("media_id") @db.Uuid
  position  Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  media     Media   @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  @@id([productId, mediaId])
  @@index([productId, position])
  @@map("product_media")
}

model Collection {
  id           String    @id @default(uuid(7)) @db.Uuid
  storeId      String    @map("store_id") @db.Uuid
  title        String
  slug         String
  description  String?
  imageMediaId String?   @map("image_media_id") @db.Uuid
  isPublished  Boolean   @default(true) @map("is_published")
  position     Int       @default(0)                // ordre dans la navigation du site
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  store        Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products     CollectionProduct[]
  @@unique([storeId, slug])
  @@index([storeId, position])
  @@map("collections")
}

model CollectionProduct {
  storeId      String     @map("store_id") @db.Uuid
  collectionId String     @map("collection_id") @db.Uuid
  productId    String     @map("product_id") @db.Uuid
  position     Int
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@id([collectionId, productId])
  @@index([collectionId, position])
  @@index([productId])
  @@map("collection_products")
}

// ───────────── inventory ─────────────
model InventoryLevel {
  variantId         String         @id @map("variant_id") @db.Uuid
  storeId           String         @map("store_id") @db.Uuid
  onHand            Int            @default(0) @map("on_hand")
  reserved          Int            @default(0)
  lowStockThreshold Int?           @map("low_stock_threshold")   // null ⇒ Store.lowStockDefault
  version           Int            @default(0)
  updatedAt         DateTime       @updatedAt @map("updated_at")
  variant           ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  @@index([storeId])
  @@map("inventory_levels")
}

model StockMovement {
  id          String            @id @default(uuid(7)) @db.Uuid
  storeId     String            @map("store_id") @db.Uuid
  variantId   String            @map("variant_id") @db.Uuid
  type        StockMovementType
  quantity    Int                                    // signé : +10, -3
  onHandAfter Int               @map("on_hand_after")
  reason      String?
  orderId     String?           @map("order_id") @db.Uuid
  actorUserId String?           @map("actor_user_id") @db.Uuid
  createdAt   DateTime          @default(now()) @map("created_at")
  variant     ProductVariant    @relation(fields: [variantId], references: [id], onDelete: Cascade)
  @@index([storeId, variantId, createdAt(sort: Desc)])
  @@map("stock_movements")
}

// ───────────── orders ─────────────
model Customer {
  id             String   @id @default(uuid(7)) @db.Uuid
  storeId        String   @map("store_id") @db.Uuid
  email          String                               // normalisé en minuscules
  firstName      String?  @map("first_name")
  lastName       String?  @map("last_name")
  phone          String?
  defaultAddress Json?    @map("default_address")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  store          Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  orders         Order[]
  @@unique([storeId, email])
  @@index([storeId, lastName])
  @@map("customers")
}

model Order {
  id              String        @id @default(uuid(7)) @db.Uuid
  storeId         String        @map("store_id") @db.Uuid
  number          Int?                                  // attribué au passage (DRAFT ⇒ null)
  publicToken     String        @unique @map("public_token")   // lien de suivi acheteur (32 octets base64url)
  customerId      String?       @map("customer_id") @db.Uuid
  email           String?                               // instantané
  status          OrderStatus   @default(DRAFT)
  paymentStatus   PaymentStatus @default(UNPAID) @map("payment_status")
  source          OrderSource
  currency        String        @db.Char(3)
  subtotalAmount  Int           @default(0) @map("subtotal_amount")
  shippingAmount  Int           @default(0) @map("shipping_amount")
  totalAmount     Int           @default(0) @map("total_amount")
  shippingAddress Json?         @map("shipping_address")
  shippingMethod  String?       @map("shipping_method")
  note            String?
  cancelReason    String?       @map("cancel_reason")
  placedAt        DateTime?     @map("placed_at")
  paidAt          DateTime?     @map("paid_at")
  fulfilledAt     DateTime?     @map("fulfilled_at")
  cancelledAt     DateTime?     @map("cancelled_at")
  version         Int           @default(0)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  store           Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  customer        Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  lines           OrderLine[]
  @@unique([storeId, number])
  @@index([storeId, status, createdAt(sort: Desc)])
  @@index([storeId, customerId])
  @@map("orders")
}

model OrderLine {
  id              String          @id @default(uuid(7)) @db.Uuid
  storeId         String          @map("store_id") @db.Uuid
  orderId         String          @map("order_id") @db.Uuid
  variantId       String?         @map("variant_id") @db.Uuid
  productTitle    String          @map("product_title")      // instantané [R6]
  variantTitle    String          @map("variant_title")
  sku             String
  unitPriceAmount Int             @map("unit_price_amount")
  quantity        Int
  lineTotalAmount Int             @map("line_total_amount")
  position        Int
  order           Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant         ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  @@index([orderId, position])
  @@index([storeId, variantId])
  @@map("order_lines")
}

// ───────────── sites ─────────────
model Site {
  id                  String     @id @default(uuid(7)) @db.Uuid
  storeId             String     @unique @map("store_id") @db.Uuid
  subdomain           String     @unique
  templateId          String     @default("default") @map("template_id")
  templateVersion     String     @map("template_version")
  themeSettings       Json       @map("theme_settings")          // en ligne
  draftThemeSettings  Json       @map("draft_theme_settings")    // en cours d'édition
  status              SiteStatus @default(DRAFT)
  publishedAt         DateTime?  @map("published_at")
  customDomain        String?    @unique @map("custom_domain")  // V2
  version             Int        @default(0)
  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")
  store               Store      @relation(fields: [storeId], references: [id], onDelete: Cascade)
  @@map("sites")
}

// ───────────── outbox ─────────────
model OutboxEvent {
  id          String    @id @db.Uuid                 // = id de l'événement de domaine
  storeId     String?   @map("store_id") @db.Uuid
  type        String
  aggregateId String    @map("aggregate_id")
  payload     Json
  occurredAt  DateTime  @map("occurred_at")
  publishedAt DateTime? @map("published_at")
  attempts    Int       @default(0)
  lastError   String?   @map("last_error")
  @@index([occurredAt])
  @@map("outbox_events")
}
```

### 5.1 SQL ajouté à la main dans les migrations
On crée la migration avec `prisma migrate dev --create-only`, on ajoute ce SQL, puis on applique.
```sql
-- catalog (P1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX products_title_trgm ON products USING gin (title gin_trgm_ops);
ALTER TABLE product_variants ADD CONSTRAINT price_non_negative CHECK (price_amount >= 0 AND (compare_at_amount IS NULL OR compare_at_amount >= 0));

-- inventory (P2) : R4 garanti par la base, même en cas de bug applicatif
ALTER TABLE inventory_levels ADD CONSTRAINT stock_consistent
  CHECK (on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand);

-- orders (P3)
ALTER TABLE order_lines ADD CONSTRAINT line_positive CHECK (quantity > 0 AND unit_price_amount >= 0);
ALTER TABLE orders ADD CONSTRAINT number_when_placed CHECK (status = 'DRAFT' OR number IS NOT NULL);

-- outbox (P0) : index partiel pour le relais
CREATE INDEX outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
```

### 5.2 Découpage des migrations
| Phase | Migration | Modèles |
|---|---|---|
| P0 | `init_identity_stores_outbox` | User, Store, StoreMember, StoreCounter, OutboxEvent |
| P1 | `catalog` | Brand, Product, ProductVariant, Media, ProductMedia, Collection, CollectionProduct |
| P2 | `inventory` | InventoryLevel, StockMovement |
| P3 | `orders` | Customer, Order, OrderLine |
| P4 | `sites` | Site |

**Seed** (`prisma/seed.ts`, idempotent) : 2 boutiques de démonstration (EUR et XOF), 3 marques, 12 produits avec variantes, du stock, 2 catalogues, quelques commandes. Il sert au développement et aux tests d'isolation.

---

## 6. Socle technique : squelettes de code clés

Ces extraits fixent les **contrats** du socle. Le code final peut différer dans le détail, pas dans l'intention.

### 6.1 Noyau de domaine (`shared/domain`)
```ts
// domain-event.ts
export interface DomainEvent<P = unknown> {
  readonly id: string;          // uuidv7
  readonly type: string;        // 'orders.order.placed'
  readonly storeId: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: P;
}

// aggregate-root.ts
export abstract class AggregateRoot<TId extends string = string> {
  #events: DomainEvent[] = [];
  protected constructor(readonly id: TId, protected _version = 0) {}
  get version() { return this._version; }
  protected record(event: DomainEvent) { this.#events.push(event); }
  pullEvents(): DomainEvent[] { return this.#events.splice(0); }
}

// domain-error.ts : typées par nature, traduites en HTTP par le filtre (§6.3)
export abstract class DomainError extends Error {
  abstract readonly kind: 'validation' | 'not_found' | 'conflict' | 'forbidden';
  constructor(readonly code: string, message: string, readonly details?: unknown) { super(message); }
}

// money.vo.ts
export const CURRENCY_EXPONENT = { EUR: 2, USD: 2, GBP: 2, MAD: 2, XOF: 0, XAF: 0 } as const;
export type Currency = keyof typeof CURRENCY_EXPONENT;
export class Money {
  private constructor(readonly amount: number, readonly currency: Currency) {}
  static of(amount: number, currency: Currency) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new InvalidMoneyError(amount);
    return new Money(amount, currency);
  }
  add(o: Money) { this.assertSame(o); return Money.of(this.amount + o.amount, this.currency); }
  times(qty: number) { return Money.of(this.amount * qty, this.currency); }
  private assertSame(o: Money) { if (o.currency !== this.currency) throw new CurrencyMismatchError(); }
}
```

### 6.2 Prisma, contexte tenant et Unit of Work
```ts
// cls/tenant-context.ts
export interface MarcheCls extends ClsStore { storeId?: string; userId?: string; role?: MemberRole; system?: boolean }
@Injectable()
export class TenantContext {
  constructor(private readonly cls: ClsService<MarcheCls>) {}
  get storeId(): string {
    const id = this.cls.get('storeId');
    if (!id) throw new MissingTenantError();
    return id;
  }
  runForStore<T>(storeId: string, fn: () => Promise<T>) {
    return this.cls.run(async () => { this.cls.set('storeId', storeId); return fn(); });
  }
  runAsSystem<T>(fn: () => Promise<T>) {
    return this.cls.run(async () => { this.cls.set('system', true); return fn(); });
  }
}

// prisma/tenant-scope.extension.ts : Proxy de protection [§4.4]
const TENANT_MODELS = new Set(['Brand','Product','ProductVariant','Media','ProductMedia','Collection',
  'CollectionProduct','InventoryLevel','StockMovement','Customer','Order','OrderLine','Site']);
export const tenantScope = (cls: ClsService<MarcheCls>) => Prisma.defineExtension({
  query: { $allModels: { async $allOperations({ model, operation, args, query }) {
    if (!TENANT_MODELS.has(model) || cls.get('system')) return query(args);
    const storeId = cls.get('storeId');
    if (!storeId) throw new MissingTenantError(model, operation);   // on n'accède jamais à un modèle tenant « à l'aveugle »
    return query(injectStoreId(operation, args, storeId));           // where / data / create selon l'opération
  } } },
});

// prisma/prisma.provider.ts
export const createPrisma = (url: string, cls: ClsService<MarcheCls>) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }).$extends(tenantScope(cls));
export type AppPrisma = ReturnType<typeof createPrisma>;
export const PRISMA = Symbol('PRISMA');

// cls.module.ts : Unit of Work [§5.4]
ClsModule.forRoot({
  global: true,
  middleware: { mount: true, generateId: true },
  plugins: [new ClsPluginTransactional({
    imports: [PrismaModule],
    adapter: new TransactionalAdapterPrisma<AppPrisma>({ prismaInjectionToken: PRISMA }),
  })],
});

// Dans un repository :
constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<AppPrisma>>) {}
save(p: Product) { return this.txHost.tx.product.upsert(/* … */); }
```
`injectStoreId` gère les opérations une par une. Avec Prisma ≥ 5, `findUnique`, `update` et `delete` acceptent des champs non uniques dans `where` :
- **Lectures, `update*`, `delete*`** : ajout de `storeId` au `where`.
- **`create` / `createMany`** : ajout de `storeId` à `data` (s'il est déjà présent, il doit être identique, sinon erreur).
- **`upsert`** : ajout dans `where` et dans `create`.

### 6.3 Validation Zod et erreurs RFC 9457
```ts
// http/zod.pipe.ts
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}
  transform(value: unknown) {
    const r = this.schema.safeParse(value);
    if (!r.success) throw new RequestValidationError(r.error.issues);
    return r.data;
  }
}
export const ZodBody  = <S extends z.ZodType>(s: S) => Body(new ZodValidationPipe(s));
export const ZodQuery = <S extends z.ZodType>(s: S) => Query(new ZodValidationPipe(s));
export const ApiZodBody = (s: z.ZodType) =>
  ApiBody({ schema: z.toJSONSchema(s, { target: 'openapi-3.0' }) as SchemaObject });

// Usage
@Post() @ApiZodBody(createProductSchema)
create(@ZodBody(createProductSchema) input: CreateProductInput) { return this.createProduct.execute(input); }

// http/problem-details.filter.ts
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(ex: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const p = toProblem(ex);   // DomainError → 422/404/409/403 ; Prisma P2002 → 409 UNIQUE_VIOLATION ; P2025 → 404 ; sinon 500 (logué)
    res.status(p.status).type('application/problem+json').json(p);   // { type, title, status, code, detail, errors? }
  }
}
```

### 6.4 Authentification et tenant (ordre des guards globaux)
`ThrottlerGuard → ClerkAuthGuard → TenantGuard → RolesGuard`, déclarés via `APP_GUARD` dans cet ordre.

- **`ClerkAuthGuard`** :
  - ignoré si la route est `@Public()` ;
  - lit `Authorization: Bearer` et appelle `verifyToken(token, { secretKey, jwtKey?, authorizedParties })` de `@clerk/backend` ;
  - place dans le CLS `userId` (résolu depuis `sub`, avec **création du `User` à la volée** s'il n'existe pas, pour ne pas dépendre des webhooks en dev) et les claims d'organisation `o.id` et `o.rol`.
- **`TenantGuard`** :
  - ignoré pour `@Public()` et `@NoStoreRequired()` (ex. `POST /stores`) ;
  - sans `o.id` : `403 STORE_REQUIRED` ;
  - sinon `StoresFacade.resolveByClerkOrg(o.id)` (cache Redis de 5 min) : place `storeId` dans le CLS ;
  - vérifie que l'utilisateur est membre de la boutique.
- **`RolesGuard`** : `@Roles('ADMIN')`. Correspondance : `o.rol` `admin` → `ADMIN`, `member` → `STAFF`. Le créateur de la boutique est `OWNER` en base.
- **`StorefrontGuard`**, sur les routes `/storefront/v1` en `@Public()` :
  - vérifie l'en-tête `X-Storefront-Token` (secret partagé, le storefront appelant l'API **côté serveur uniquement**) ;
  - lit `X-Store-Host` (sous-domaine) et résout `Site` → `storeId`, en lecture système (`runAsSystem`) car aucun tenant n'est encore connu, avec un cache Redis de 60 s ;
  - si le site n'est pas publié : 404, sauf avec un jeton d'aperçu valide.
- **Webhooks Clerk** :
  - `NestFactory.create(AppModule, { rawBody: true })` ;
  - `new Webhook(secret).verify(req.rawBody, headers)` (svix) ;
  - événements traités : `user.*`, `organization.*`, `organizationMembership.*` ;
  - handlers idempotents (upsert).

### 6.5 Outbox, routage des événements, jobs
```ts
// shared/infrastructure/queue/queues.ts
export const QUEUES = ['outbox-relay','notifications','site-publishing','media','inventory-alerts','analytics'] as const;

// outbox/event-routes.ts : chaque module abonné déclare ses routes (Observer)
export interface EventRoute { event: string; queue: QueueName; job: string }
// ex. dans notifications.jobs.module.ts
OutboxModule.forFeature([
  { event: 'orders.order.placed', queue: 'notifications', job: 'order-confirmation' },
  { event: 'orders.order.placed', queue: 'notifications', job: 'merchant-new-order' },
  { event: 'inventory.stock.low', queue: 'notifications', job: 'low-stock-alert' },
]);
```
**Le relais** (`OutboxRelayProcessor`) est piloté par un job scheduler BullMQ : `queue.upsertJobScheduler('relay', { every: 1000 })`. À chaque passage :
1. Dans une transaction : `SELECT … FROM outbox_events WHERE published_at IS NULL ORDER BY occurred_at LIMIT 100 FOR UPDATE SKIP LOCKED`.
2. Pour chaque événement et chaque route correspondante : `queue.add(job, event, { jobId: \`${event.id}:${job}\`, attempts: 5, backoff: { type: 'exponential', delay: 2000 } })`. Le `jobId` déduplique : un ré-envoi ne crée pas de doublon.
3. `UPDATE outbox_events SET published_at = now()`. En cas d'erreur : `attempts + 1`, `last_error`.

**Rétention BullMQ** :
- jobs terminés : `removeOnComplete: { age: 86400 }` (la déduplication par `jobId` couvre 24 h) ;
- jobs en échec : `removeOnFail: false` (dead-letter visible dans Bull Board).

```ts
// queue/tenant-job.processor.ts : Template Method
export abstract class TenantJobProcessor<T extends { storeId?: string }> extends WorkerHost {
  constructor(protected readonly tenant: TenantContext) { super(); }
  async process(job: Job<T>) {
    const run = () => this.handle(job);
    return job.data.storeId ? this.tenant.runForStore(job.data.storeId, run) : this.tenant.runAsSystem(run);
  }
  protected abstract handle(job: Job<T>): Promise<unknown>;   // doit être idempotent
}
```

### 6.6 Storefront : routage, cache, revalidation
```ts
// apps/storefront/src/proxy.ts (Next 16 : ex-middleware)
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN!;   // "localhost:3001" en dev
export function proxy(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/s/')) return new NextResponse(null, { status: 404 });   // pas d'accès direct
  const sub = host.endsWith(`.${ROOT}`) ? host.slice(0, -(ROOT.length + 1)) : null;
  if (!sub || sub === 'www') return NextResponse.next();                            // domaine racine
  return NextResponse.rewrite(new URL(`/s/${sub}${pathname}`, req.url));
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
```
- **Cache** : `next.config.ts` → `cacheComponents: true`. Les lectures (`lib/storefront-api.ts`, `import 'server-only'`) utilisent `'use cache'` + `cacheTag(...)` + `cacheLife('hours')`.
- **Tags** :

  | Tag | Donnée mise en cache |
  |---|---|
  | `site:{sub}` | Résolution du site et thème |
  | `store:{storeId}` | Tout ce qui touche à la boutique |
  | `product:{id}` | Fiche produit |
  | `collection:{id}` | Catalogue |
  | `catalog:{storeId}` | Listes de produits |

- **Revalidation** : `api/revalidate/route.ts` (POST, en-tête `x-revalidate-secret`, corps `{ tags: string[], immediate?: boolean }`) appelle `revalidateTag(tag, immediate ? { expire: 0 } : 'max')`.
  - `immediate` est vrai pour la publication ou dépublication du site et la publication du thème ;
  - `'max'` (stale-while-revalidate) s'applique aux modifications du catalogue.
- **Disponibilité du stock** : elle **n'est pas** mise en cache sur la fiche produit. Elle est lue au moment de l'ajout au panier et dans le panier. Seuls les passages en rupture et les retours en stock revalident la fiche (`inventory.stock.out` / `inventory.stock.back`).
- **Aperçu** : route dynamique `s/[site]/preview?token=…`. Elle vérifie le jeton (JWT HS256 signé par l'API, TTL 30 min, lu avec `jose`) et rend l'accueil avec `draftThemeSettings`, sans cache. Il n'y a pas de cookie draftMode, ce qui évite les soucis de cookies tiers dans l'iframe du dashboard.

### 6.7 Dashboard : client API et clés de cache
```ts
// shared/api/client.ts
export function createApiClient(getToken: () => Promise<string | null>) {
  return async function request<T>(method: string, path: string, opts: { body?: unknown; query?: object; idempotencyKey?: string } = {}): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}${toQuery(opts.query)}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await getToken()}`,
                 ...(opts.idempotencyKey && { 'idempotency-key': opts.idempotencyKey }) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw await ApiError.fromProblem(res);   // expose .code pour les messages FR
    return res.status === 204 ? (undefined as T) : res.json();
  };
}
// shared/api/query-keys.ts : toujours préfixées par la boutique active
export const qk = {
  products: (storeId: string) => ({
    all: ['store', storeId, 'products'] as const,
    list: (f: ProductFilters) => ['store', storeId, 'products', 'list', f] as const,
    detail: (id: string) => ['store', storeId, 'products', 'detail', id] as const,
  }),
  // brands, collections, inventory, orders, customers, site, reporting…
};
```
Quand l'organisation active change (`OrganizationSwitcher`), on appelle `queryClient.clear()`.

---

## 7. Phases de réalisation

### Phase 0 : Fondations
**Objectif** : un marchand se connecte, crée sa boutique, et l'infrastructure (BD, files, outbox, CI) tourne de bout en bout.

**0.A : Monorepo et outillage**
- [x] **P0-01** Gestionnaire de paquets : **npm 12**, livré avec Node 26 (pnpm abandonné le 2026-09-27, à la demande du porteur du projet). Fixer `.nvmrc` (26).
- [x] **P0-02** Créer le monorepo :
  - supprimer `backend/.git` (aucun commit) et faire `git init` à la racine ;
  - déplacer `backend/` vers `apps/api` et le renommer `@marche/api` ;
  - remplacer le `package-lock.json` du scaffold par un lockfile unique à la racine ;
  - créer le `package.json` racine (workspaces npm + outils partagés, §1) et `turbo.json` (tâches `dev` persistante, `build` avec `dependsOn: ["^build"]`, `lint`, `typecheck`, `test`, `test:int`, `test:e2e`) ;
  - remonter `.prettierrc` et `.oxlintrc.json` à la racine, et passer la règle `typescript/no-explicit-any` à `error` (elle est désactivée dans le scaffold) ;
  - fusionner `.gitignore`, ajouter `.editorconfig`.
- [x] **P0-03** `packages/config` : `tsconfig.base.json` (strict, ES2023), `tsconfig.nest.json` (nodenext + décorateurs, repris du scaffold), `tsconfig.lib.json` (packages compilés, `noUncheckedIndexedAccess`), `tsconfig.react.json` (bundler, jsx). `apps/api/tsconfig.json` étend `tsconfig.nest.json`.
- [x] **P0-04** `packages/contracts` :
  - package ESM compilé par `tsc` (`dist/` + `.d.ts`, `exports`) ;
  - `src/common.ts` : `moneySchema`, `currencySchema`, `paginationQuerySchema` (`cursor`, `limit` ≤ 100), `paginated<T>()`, `problemSchema` ;
  - `src/stores.ts` : `createStoreSchema` (slug `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$`, hors liste réservée : `www`, `app`, `api`, `admin`, `docs`, `mail`, `static`, `assets`, `s`).
- [x] **P0-05** Créer `docker-compose.yml` (§4.2) et `apps/api/.env.example` (§4.3). Les `.env.example` du dashboard et du storefront seront créés avec leurs apps (P0-15, P0-16).

**0.B : Socle API**
- [ ] **P0-06** Config :
  - `env.schema.ts` (Zod) + `ConfigModule` global ;
  - `ObserveModule` activé seulement si `OBSERVE_APP_KEY` est défini (les clés en dur du scaffold sont supprimées) ;
  - `main.ts` : `rawBody: true`, helmet, CORS en liste blanche, `enableShutdownHooks`, Swagger sur `/docs` hors production.
- [ ] **P0-07** Prisma :
  - installer `prisma`, `@prisma/client`, `@prisma/adapter-pg` en **version exacte `7.10.0`** (`npm i -E … -w @marche/api`), plus `dotenv` et `tsx` ;
  - `prisma.config.ts` + migration P0 (§5.2) + index partiel de l'outbox ;
  - `src/generated/` dans `.gitignore` ;
  - `prisma generate` exécuté par `build` (`prebuild`) et par le script `db:generate`, pas par `postinstall` : npm 12 bloque par défaut les scripts d'installation.
- [ ] **P0-08** Noyau de domaine `shared/domain` (§6.1) avec tests unitaires (`Money`, `Slug`, `Email`, `AggregateRoot`).
- [ ] **P0-09** Infrastructure partagée :
  - CLS + `TenantContext` + extension tenant + Transactional (§6.2) ;
  - `ProblemDetailsFilter`, pipe Zod et décorateurs (§6.3) ;
  - nestjs-pino (champs `reqId`, `storeId`, `userId` ; `pino-pretty` en dev) ;
  - `@nestjs/terminus` : `/health/live`, `/health/ready` (Prisma `SELECT 1` + Redis `PING`).
- [ ] **P0-10** Redis et files :
  - `ioredis` ; `BullModule.forRootAsync` avec `maxRetriesPerRequest: null` ;
  - enregistrement des 6 files (§6.5) ;
  - `TenantJobProcessor` ;
  - Bull Board sur `/admin/queues` (authentification basique) ;
  - `@nestjs/throttler` (stockage Redis ; 100 requêtes/min par IP sur l'admin).
- [ ] **P0-11** Outbox :
  - `OutboxPort` + `PrismaOutboxRepository` (écrit via `txHost.tx`) ;
  - `OutboxModule.forFeature(routes)` ;
  - `OutboxRelayProcessor` (§6.5) ;
  - test d'intégration : événement écrit dans une transaction annulée → jamais publié ; transaction validée → job créé une seule fois, même après deux passages du relais.
- [ ] **P0-12** `worker.ts` + `WorkerModule` :
  - `NestFactory.createApplicationContext` ;
  - importe les mêmes modules que l'API, plus les `*.jobs.module.ts` ;
  - arrêt propre (`worker.close()`).

**0.C : Identité et boutique [UC-01, UC-02, UC-03]**
- [ ] **P0-13** Module `identity` :
  - `ClerkAuthGuard`, `TenantGuard`, `RolesGuard` ;
  - décorateurs `@Public()`, `@NoStoreRequired()`, `@Roles()`, `@CurrentUser()`, `@CurrentStore()` ;
  - création des utilisateurs à la volée ;
  - `ClerkWebhooksController` (svix) ;
  - port `IdentityProviderPort` (`createOrganization`, `deleteOrganization`, `updateOrganization`) avec l'adapter Clerk (`createClerkClient`).
- [ ] **P0-14** Module `stores` :
  - agrégat `Store` (Slug, devise, pays) ;
  - `CreateStoreUseCase` :
    1. vérifier que le slug est libre ;
    2. `IdentityProviderPort.createOrganization({ name, slug, createdBy })` ;
    3. en transaction : `Store` + `StoreMember(OWNER)` + `StoreCounter` + outbox `stores.store.created` ;
    4. si la base échoue : **compensation** `deleteOrganization`.
  - `GetCurrentStoreQuery`, `UpdateStoreUseCase` ;
  - `StoresFacade.resolveByClerkOrg()` ;
  - endpoints : `POST /api/v1/stores` (`@NoStoreRequired`), `GET` et `PATCH /api/v1/stores/current`.

**0.D : Squelettes front**
- [ ] **P0-15** `apps/dashboard` :
  - Vite 8 + React 19 + TS ;
  - Tailwind v4 (`@tailwindcss/vite`) ; shadcn initialisé en mode monorepo avec les composants dans `packages/ui` ;
  - TanStack Router (plugin, routes fichiers) + TanStack Query + `@clerk/react` + PostHog ;
  - routes :
    - `__root.tsx` ;
    - `sign-in.$.tsx`, `sign-up.$.tsx` ;
    - `onboarding.tsx` : formulaire boutique → `POST /stores` → `setActive({ organization })` → redirection ;
    - `_app.tsx` : layout protégé (connecté + organisation active, sinon redirection vers onboarding) avec barre latérale (Accueil, Produits, Marques, Catalogues, Stock, Commandes, Clients, Site, Paramètres), `OrganizationSwitcher` et `UserButton` ;
    - `_app/index.tsx` (accueil provisoire) ;
    - `_app/settings.tsx` (UC-03) ;
  - client API (§6.7) ; Toaster (sonner) ; transitions de page Motion avec `useReducedMotion`.
- [ ] **P0-16** `apps/storefront` :
  - Next 16 (App Router, `src/`), Tailwind v4, `@marche/ui` ;
  - `proxy.ts` (§6.6), `lib/env.ts` ;
  - `app/page.tsx` : page vitrine de la plateforme ;
  - `s/[site]/layout.tsx` et `page.tsx` : « Bientôt disponible » ;
  - `api/revalidate/route.ts`.

**0.E : Qualité et CI**
- [ ] **P0-17** `.dependency-cruiser.cjs` avec les règles suivantes :
  - `no-cross-module-internals` ;
  - `domain-is-pure` : `modules/*/domain` et `shared/domain` n'importent ni `@nestjs/*`, ni `@prisma/*`, ni `generated/`, ni `infrastructure` ;
  - `no-circular` ;
  - `contracts-no-app-imports`.
- [ ] **P0-18** `.github/workflows/ci.yml` (§9.1) et protection de la branche `main`.
- [ ] **P0-19** `README.md` racine : prérequis, démarrage (§4.1), scripts, liens vers la documentation.

**DoD phase 0**
- `npm run infra:up && npm run dev` démarre l'API, le worker, le dashboard et le storefront sans erreur.
- Parcours complet : inscription Clerk → onboarding → la boutique est créée (organisation Clerk + ligne `stores`) → l'accueil du dashboard affiche son nom. `GET /api/v1/stores/current` la renvoie.
- L'événement `stores.store.created` est journalisé par le worker (route de démonstration), une seule fois.
- `http://ma-boutique.localhost:3001` affiche « Bientôt disponible ».
- Un appel sans jeton renvoie 401 en `problem+json`. `/health/ready` répond 200.
- La CI est verte : lint, typecheck, tests unitaires et d'intégration, frontières.

---

### Phase 1 : Catalogue [UC-10 à UC-17]
**Objectif** : gérer marques, produits (variantes, images) et catalogues depuis le dashboard.

**Back**
- [ ] **P1-01** Contrats Zod (`packages/contracts/src/catalog.ts`) : marques, produits (création et mise à jour avec options + variantes), filtres de liste, catalogues, ordre des produits.
- [ ] **P1-02** Migration `catalog` (§5.2) + SQL (§5.1).
- [ ] **P1-03** Domaine :
  - **`Brand`**.
  - **`Product`** :
    - contient des `ProductVariant` et les options ;
    - fabriques `create()` et `reconstitute()` ;
    - méthodes `update()`, `publish()` ([R3] : titre, ≥ 1 variante, prix ≥ 0, sinon `PRODUCT_NOT_PUBLISHABLE`), `unpublish()`, `archive()` ;
    - `duplicate()` (Prototype : nouveau slug `-copie`, SKU suffixés, statut `DRAFT`) ;
    - `generateVariants(options)` : produit cartésien des valeurs d'options ;
    - VO `Sku`, `Slug`.
  - **`Collection`** : liste ordonnée d'identifiants de produits, sans doublons.
  - **Événements** : `catalog.product.created`, `.updated`, `.published`, `.unpublished`, `.archived` et `catalog.collection.updated`.
- [ ] **P1-04** Module `media` [UC-13] :
  - `StoragePort` + `S3StorageAdapter` (`forcePathStyle` en dev, R2 en prod) ;
  - `POST /api/v1/media/upload-url` : vérifie le type MIME (jpeg, png, webp, avif) et la taille (≤ 10 Mo), crée un `Media` en PENDING, renvoie une URL `PUT` pré-signée (5 min) ;
  - `POST /api/v1/media/:id/complete` : `HeadObject` puis job `media.process` ;
  - le job (`sharp`) génère des versions webp en 400, 800 et 1600 px, remplit `renditions`, `width` et `height`, puis passe le média en READY ;
  - script `media:init` (bucket + politique de lecture publique en dev).
- [ ] **P1-05** Use cases :
  - **marques** : `CreateBrand`, `UpdateBrand`, `ArchiveBrand` ;
  - **produits** : `CreateProduct`, `UpdateProduct` (vérifie `version`, sinon `CONCURRENT_MODIFICATION`), `PublishProduct`, `UnpublishProduct`, `ArchiveProduct`, `DuplicateProduct`, `SetProductMedia` (ordre) ;
  - **catalogues** : `CreateCollection`, `UpdateCollection`, `DeleteCollection`, `SetCollectionProducts`.

  `CreateProduct` accepte déjà `initialQuantity` par variante, mais il ne sera branché sur le stock qu'en P2-04.
- [ ] **P1-06** Queries :
  - `ListProducts` : filtres `q` (trigram sur le titre, ou SKU exact), `status`, `brandId`, `collectionId` ; tri ; pagination par curseur `(updatedAt, id)` ;
  - `GetProduct` (variantes, médias, catalogues) ;
  - `ListBrands`, `ListCollections`, `GetCollection`.
- [ ] **P1-07** Controllers admin (`/api/v1/brands`, `/products`, `/collections`, `/media`) + Swagger.
- [ ] **P1-08** `CatalogFacade` :
  - `snapshotLines(variantIds)` → `{ variantId, productTitle, variantTitle, sku, unitPrice, isSellable }` (pour les commandes) ;
  - lectures « publiées » pour le storefront (P4).

**Front (dashboard)**
- [ ] **P1-09** `features/brands` : liste et recherche, dialogue de création/édition (RHF + zod partagé), archivage avec confirmation.
- [ ] **P1-10** `features/products` :
  - **liste** : TanStack Table (vignette, titre, statut, marque, nombre de variantes, prix min–max), filtres dans l'URL (search params typés), actions groupées publier/archiver ;
  - **formulaire** (`new` et `$productId`) :
    - informations générales, description Markdown, marque ;
    - médias (glisser-déposer, upload pré-signé avec progression, réordonnancement dnd-kit) ;
    - options et variantes (générées à partir des options, avec prix, SKU et stock initial éditables en ligne) ;
    - SEO ;
    - barre d'actions (Enregistrer, Publier, Dupliquer) ;
  - gestion du conflit `CONCURRENT_MODIFICATION` (proposer de recharger).
- [ ] **P1-11** `features/collections` : liste, édition (titre, description, image), sélecteur de produits (recherche), ordre par glisser-déposer (dnd-kit + Motion `layout`).

**DoD phase 1**
- Parcours : créer une marque → créer un produit à 2 options (taille × couleur = 4 variantes) avec 3 images → publier → l'ajouter à un catalogue → réordonner. Tout est persistant.
- Un SKU en double renvoie `409 SKU_TAKEN`, affiché en français sur le champ concerné.
- **Isolation** : un produit de la boutique A est introuvable depuis la boutique B (404), testé en e2e.
- Tests unitaires des invariants R1 à R3 et de `duplicate()`/`generateVariants()` ; use cases testés avec des repositories en mémoire ; repositories en intégration (Testcontainers).

---

### Phase 2 : Inventaire [UC-20 à UC-22]
**Objectif** : un stock fiable, sans jamais de survente.

- [ ] **P2-01** Migration `inventory` + contrainte `stock_consistent` (§5.1).
- [ ] **P2-02** Domaine :
  - **`InventoryLevel`** :
    - `adjust(delta, type, reason)` : produit un `StockMovement` et refuse de passer sous le réservé (`STOCK_BELOW_RESERVED`) ;
    - `available = onHand - reserved` ;
    - `isLow(threshold)`.
  - **Événements** :
    - `inventory.stock.adjusted` ;
    - `inventory.stock.low`, émis **au franchissement** du seuil uniquement ;
    - `inventory.stock.out` et `inventory.stock.back`, qui déclenchent la revalidation du site en P4.
- [ ] **P2-03** `InventoryFacade` :
  - `initialize(lines)` ;
  - `reserve(lines)` : un `UPDATE … WHERE on_hand - reserved >= q` **par ligne**, dans la transaction courante. Si 0 ligne est modifiée : `INSUFFICIENT_STOCK` avec `{ variantId, requested, available }`, et l'exception annule toute la transaction [R5] ;
  - `release(lines)` ;
  - `commit(lines)` : `on_hand -= q`, `reserved -= q` et mouvement `SALE` ;
  - `getAvailability(variantIds)`.

  Les variantes avec `trackInventory = false` sont ignorées par ces opérations.
- [ ] **P2-04** Brancher `CreateProduct` et l'ajout de variantes sur `InventoryFacade.initialize` (mouvement `INITIAL`, même transaction).
- [ ] **P2-05** Use case `AdjustStock` [UC-20] :
  - types `RECEIPT`, `ADJUSTMENT`, `LOSS`, `RETURN` ;
  - motif obligatoire pour `LOSS` et `ADJUSTMENT` ;
  - `actorUserId`.

  Queries :
  - `ListInventory` (filtres `lowStock`, `outOfStock`, `q` ; joint le titre de variante via `CatalogFacade`, jamais par `include` direct) ;
  - `ListStockMovements` [UC-21].
- [ ] **P2-06** Route `inventory.stock.low` vers `inventory-alerts` : pour l'instant un simple log, plus un compteur exposé à l'accueil du dashboard. L'e-mail arrive en P3.
- [ ] **P2-07** Dashboard `features/inventory` :
  - tableau : variante, SKU, en main, réservé, disponible, seuil ; badges « Stock bas » et « Rupture » ;
  - dialogue d'ajustement (type, quantité, motif) avec **mise à jour optimiste** ;
  - tiroir d'historique des mouvements ;
  - filtres dans l'URL.

**DoD phase 2**
- **Test de concurrence** (intégration) : stock = 10, 25 réservations parallèles d'1 unité → **exactement 10** réussissent, `reserved = 10`, aucune valeur négative.
- La contrainte SQL rejette un `UPDATE` direct qui violerait R4.
- Chaque variation de `onHand` a son mouvement, et `on_hand_after` est cohérent.
- L'ajustement depuis le dashboard est reflété immédiatement et l'historique est visible.

---

### Phase 3 : Commandes et clients [UC-30 à UC-36, UC-51]
**Objectif** : l'ERP est utilisable. On crée, passe, encaisse, expédie ou annule des commandes, et les clients reçoivent leurs e-mails.

- [ ] **P3-01** Migration `orders` + SQL (§5.1).
- [ ] **P3-02** Domaine :
  - **`Order`** :
    - pattern **State** : `DraftState`, `PlacedState`, `FulfilledState`, `CancelledState` (§5.5 de l'architecture) ;
    - lignes (VO instantané) ;
    - totaux calculés dans l'agrégat ;
    - `publicToken` généré à la création.
  - **`ShippingStrategy`** (Strategy) : `FlatRate(amount)` et `FreeOverThreshold(threshold, amount)`, lues dans `Store.shippingSettings`.
  - **`Customer`** : e-mail normalisé, upsert par `(storeId, email)`.
  - **Paiement** : `markPaid()`, valable seulement si l'état est `PLACED` ou `FULFILLED`.
  - **Événements** : `orders.order.placed`, `.paid`, `.fulfilled`, `.cancelled`.
- [ ] **P3-03** Numérotation [R8] : `UPDATE store_counters SET order_seq = order_seq + 1 WHERE store_id = $1 RETURNING order_seq`, dans la transaction de passage.
- [ ] **P3-04** Use cases :
  - `CreateDraftOrder` [UC-30] et `UpdateDraftOrder` (lignes, client, adresse, livraison, note) ;
  - **`PlaceOrder`** [UC-31] (§5.5 de l'architecture) :
    1. instantané des lignes via `CatalogFacade` (refus si la variante n'est pas vendable) ;
    2. numéro ;
    3. `InventoryFacade.reserve` ;
    4. upsert du client ;
    5. outbox.

    Il est partagé par le back-office et le checkout.
  - `MarkOrderPaid` [UC-32] ;
  - `FulfillOrder` [UC-33] → `InventoryFacade.commit` ;
  - `CancelOrder` [UC-34] : `release` si l'état est `PLACED`, motif enregistré.

  `IdempotencyInterceptor` sur `POST /orders/:id/place` :
  - clé Redis `idem:{storeId}:{route}:{key}` posée avec `SET NX` (TTL 24 h) ;
  - si la requête identique est déjà en cours : `409 IDEMPOTENCY_IN_PROGRESS` ;
  - si elle est déjà terminée : la réponse stockée est rejouée.
- [ ] **P3-05** Queries :
  - `ListOrders` (filtres statut, paiement, période, client, `q` sur numéro ou e-mail) ;
  - `GetOrder` (avec une chronologie construite depuis les horodatages) ;
  - `ListCustomers` (nombre de commandes et total dépensé calculés en SQL) ;
  - `GetCustomer` (avec son historique) [UC-35, UC-36].
- [ ] **P3-06** Module `notifications` (Bridge : `Notification` × `Channel`) :
  - `EmailPort` avec deux adapters, `SmtpEmailAdapter` (nodemailer → Mailpit, en dev) et `ResendEmailAdapter` (prod), choisis par `EMAIL_PROVIDER` ;
  - `packages/emails` : templates React Email `order-confirmation`, `merchant-new-order`, `low-stock-alert`, `order-shipped` ;
  - processors abonnés via les routes de l'outbox, idempotents (clé `jobId`).
- [ ] **P3-07** Dashboard :
  - **`features/orders`** :
    - liste (badges de statut et de paiement, filtres dans l'URL) ;
    - **création** : recherche ou création de client, sélecteur de variantes avec disponibilité en direct, quantités, livraison, récapitulatif des totaux ;
    - **détail** :
      - lignes, totaux, adresse, chronologie animée (Motion) ;
      - boutons d'action **activés selon l'état** (Passer, Marquer payée, Expédier, Annuler + motif) ;
      - clé d'idempotence générée à l'ouverture de la confirmation.
  - **`features/customers`** : liste et fiche client avec son historique de commandes.

**DoD phase 3**
- Cycle complet depuis le dashboard : brouillon → passée (stock réservé, n° #1001) → payée → expédiée (stock consommé, mouvement `SALE`). Une autre commande est passée puis annulée : le stock est libéré.
- Une transition invalide (expédier un brouillon) renvoie `409 INVALID_ORDER_TRANSITION`.
- Un double clic sur « Passer » ne crée qu'une seule commande (idempotence).
- Les e-mails de confirmation et de nouvelle commande sont visibles dans Mailpit, sans doublon même si le relais repasse.
- Tests unitaires de la machine à états (toutes les transitions, autorisées ou non) et des stratégies de livraison ; tests e2e du cycle de vie.

---

### Phase 4 : Site et storefront [UC-40 à UC-46]
**Objectif** : « Générer mon site » met en ligne une boutique fonctionnelle, avec panier et checkout invité.

**Contrat de template**
- [ ] **P4-01** `packages/contracts/src/templates/` :
  - `themeBaseSchema` : `colors` (primary, background, foreground, accent), `fonts` (`heading` et `body` choisies dans une liste de Google Fonts), `logoMediaId`, `announcement` ;
  - `sections` : union discriminée par `type`, parmi `hero`, `featured-collection`, `product-grid`, `brand-strip`, `rich-text`, `newsletter` (désactivée en MVP) ;
  - `default.ts` : `settingsSchema` + `defaultSettings` + `manifest` (`id: 'default'`, `version: '1.0.0'`).

  Ce code, sans React, est utilisé par l'API (validation) et par le dashboard (éditeur).

**Back**
- [ ] **P4-02** Migration `sites`.
- [ ] **P4-03** Module `sites` :
  - agrégat `Site` (State `DRAFT → PUBLISHED ⇄ UNPUBLISHED`) ;
  - **`GenerateSiteUseCase`** [UC-40] :
    1. `structuredClone(template.defaultSettings)` (Prototype) ;
    2. pré-remplissage : nom et logo de la boutique, 1er catalogue publié dans `featured-collection`, sinon `product-grid` ;
    3. `subdomain = store.slug` ;
    4. `themeSettings = draftThemeSettings = settings` ;
    5. `publish()` ;
    6. outbox `sites.site.published` ;
    7. réponse `{ url }`.

    Il est idempotent : s'il existe déjà un site, il renvoie celui-ci.
  - `UpdateDraftTheme` [UC-41] (validation par le `settingsSchema` du template) ;
  - `PublishTheme` (brouillon → en ligne) ;
  - `PublishSite` et `UnpublishSite` [UC-42] ;
  - `GetSite` ;
  - `CreatePreviewToken` (JWT HS256 via `jose`, 30 min).
- [ ] **P4-04** Revalidation [UC-46] :
  - routes d'événements vers `site-publishing` :

    | Événement | Tags revalidés |
    |---|---|
    | `catalog.product.*` | `product:{id}`, `catalog:{storeId}` |
    | `catalog.collection.updated` | `collection:{id}` |
    | `sites.theme.published`, `sites.site.(un)published` | `site:{sub}`, avec `immediate` |
    | `inventory.stock.out` / `.back` | `product:{id}` |
  - le processor appelle `POST {STOREFRONT_INTERNAL_URL}/api/revalidate` ;
  - après une publication : **préchauffage** (GET de l'accueil et des 5 premiers catalogues).
- [ ] **P4-05** API storefront (`/storefront/v1`, `StorefrontGuard`, throttling par IP transmise dans `X-Forwarded-For`) :
  - `GET /store` : boutique + thème + navigation (catalogues publiés) ;
  - `GET /products` (actifs seulement, pagination, filtres par catalogue et par marque) ;
  - `GET /products/:slug` ;
  - `GET /collections` et `GET /collections/:slug` ;
  - `GET /availability?variantIds=` ;
  - `GET /orders/:publicToken` (confirmation acheteur, données minimales).
- [ ] **P4-06** Module `checkout` :
  - **Panier** :
    - agrégat `Cart` : lignes `variantId` + quantité, maximum 50 lignes et 99 unités par ligne ;
    - `RedisCartRepository` : JSON, TTL de 7 jours prolongé à chaque accès ;
    - use cases `CreateCart`, `AddCartLine`, `UpdateCartLine`, `RemoveCartLine`, `GetCart` (enrichi des prix et de la disponibilité via les façades).
  - **`CheckoutUseCase`** [UC-45] :
    - chaîne de validations (**Chain of Responsibility**) : `StorePublished → ItemsSellable → StockAvailable → PriceUnchanged` ;
    - en cas d'échec : `409 CART_CHANGED` avec le détail ligne par ligne ;
    - sinon `PlaceOrder` (source `STOREFRONT`), puis suppression du panier, puis `{ orderNumber, publicToken }` ;
    - `Idempotency-Key` obligatoire.

**Front storefront**
- [ ] **P4-07** Couche de données : `lib/storefront-api.ts` (`server-only`, `'use cache'`, tags du §6.6, en-têtes `X-Storefront-Token` et `X-Store-Host`) et `next.config.ts` (`cacheComponents`, `images.remotePatterns` du média).
- [ ] **P4-08** Template `default` (**la maquette fournie remplace le style provisoire**) :
  - `templates/types.ts` (Abstract Factory, §5.5 de l'architecture) et `templates/index.ts` (registre) ;
  - sections : `Header` (logo, navigation, bouton panier avec compteur), `Hero`, `FeaturedCollection`, `ProductGrid`, `BrandStrip`, `RichText`, `Footer` ;
  - composants : `ProductCard`, `Price` (formatage selon la devise), `VariantPicker`, `Gallery`, `CartDrawer`, `EmptyState` ;
  - thème : injection des **CSS variables** dans `s/[site]/layout.tsx`, consommées par Tailwind v4 (`@theme inline`) ; polices via `next/font` ;
  - animations Motion discrètes (apparition de sections, tiroir du panier, ajout au panier), désactivées si `prefers-reduced-motion`.
- [ ] **P4-09** Pages :
  - accueil : rendu des sections (**Composite**) ;
  - `products/[slug]` : galerie, variantes, disponibilité lue au clic, ajout au panier ;
  - `collections` et `collections/[slug]` ;
  - `cart` ;
  - `checkout` : formulaire invité (e-mail, nom, téléphone, adresse) avec RHF + schéma partagé, clé d'idempotence générée au montage, gestion de `CART_CHANGED` (mise à jour du panier + message) ;
  - `orders/[token]` : confirmation ;
  - `not-found` ;
  - `sitemap.ts` ;
  - `robots.txt/route.ts` : route handler, car le fichier `robots.ts` n'est accepté qu'à la racine de `app/` et ne peut donc pas varier par boutique ;
  - `generateMetadata` et JSON-LD `Product` ;
  - état « Bientôt disponible » s'il n'y a aucun produit actif [R10].
- [ ] **P4-10** Server Actions `actions/cart.ts` et `actions/checkout.ts` (cookie httpOnly `cart_id`, `SameSite=Lax`, `Secure` en production).
- [ ] **P4-11** Bandeau de consentement : refus par défaut, choix mémorisé. `posthog-js` n'est initialisé qu'après acceptation et envoie les événements `product_viewed`, `add_to_cart` et `checkout_started`, groupés par `store`.
- [ ] **P4-12** Route d'aperçu `s/[site]/preview` (§6.6).

**Front dashboard**
- [ ] **P4-13** `features/site-builder` :
  - **sans site** : écran d'accueil avec le gros bouton **« Générer mon site »**, une animation de génération en 3 étapes (Motion), puis l'URL cliquable et des confettis discrets ;
  - **avec site** : URL, statut, boutons Publier et Dépublier ;
  - **éditeur de thème** :
    - panneau de gauche : couleurs, polices, logo, sections (ajouter, retirer, réordonner avec dnd-kit, éditer le texte et le catalogue ciblé) ;
    - à droite : **iframe d'aperçu** (jeton d'aperçu) rechargée à chaque sauvegarde du brouillon ;
    - bouton **« Publier les modifications »**.

**DoD phase 4**
- Un clic sur « Générer mon site » rend `http://{slug}.localhost:3001` accessible **immédiatement**, avec les produits et catalogues de la boutique.
- Modifier le prix d'un produit met à jour la fiche après revalidation (visite suivante). Publier le thème s'applique immédiatement.
- Parcours acheteur : panier → checkout invité → confirmation. La commande apparaît dans le dashboard (source `STOREFRONT`), le stock est réservé et les 2 e-mails sont dans Mailpit.
- Un stock épuisé entre l'ajout au panier et le checkout donne `CART_CHANGED`, expliqué à l'acheteur.
- Lighthouse mobile ≥ 90 en performance et ≥ 95 en accessibilité sur l'accueil et la fiche produit. Le SEO est valide (sitemap, métadonnées, JSON-LD).
- Un site dépublié répond 404. `/s/...` est inaccessible directement.

---

### Phase 5 : Tableau de bord, analytics, durcissement, production [UC-50]
- [ ] **P5-01** Module `reporting` : `GET /api/v1/reporting/overview?period=7d|30d|90d` renvoie les indicateurs suivants, calculés en SQL agrégé avec `::bigint` puis convertis :
  - CA = somme des `total_amount` des commandes `PLACED` et `FULFILLED` ;
  - nombre de commandes ;
  - panier moyen ;
  - commandes à expédier ;
  - produits en stock bas ou en rupture ;
  - top 5 des produits ;
  - série journalière.
- [ ] **P5-02** Accueil du dashboard : cartes KPI, graphique (shadcn charts / recharts), listes « À expédier » et « Stock bas », checklist d'onboarding (1er produit → 1er catalogue → site généré → 1re commande).
- [ ] **P5-03** PostHog :
  - **dashboard** : `identify(userId)`, `group('store', storeId)`, événements d'activation, feature flag `template-picker` (préparation de la V2) ;
  - **API** : `AnalyticsPort` + `PostHogAnalyticsAdapter` (posthog-node) branchés sur la file `analytics` pour `order_placed`, `site_published` et `product_created` ;
  - error tracking activé sur les deux fronts.
- [ ] **P5-04** Sécurité :
  - throttling renforcé sur le checkout et les paniers (10 requêtes/min par IP pour le checkout) ;
  - revue de la configuration helmet et CORS ;
  - revue des rôles : actions destructrices réservées à `ADMIN`/`OWNER` ;
  - audit des dépendances (`npm audit`, bloquant en CI au niveau `high`) ;
  - revue du SQL brut (filtre `store_id`) ;
  - rotation des secrets documentée.
- [ ] **P5-05** Tests e2e Playwright (`@clerk/testing` pour l'authentification) :
  - parcours complet : onboarding → produit → catalogue → génération du site → checkout invité → expédition ;
  - suites d'isolation et de concurrence dans la CI.
- [ ] **P5-06** Observabilité :
  - logs JSON en prod ;
  - `@nestjs/observe` (si retenu) ou OpenTelemetry ;
  - alertes : 5xx, jobs en échec > N, file `outbox` en retard > 1 min, `/health/ready` KO.
- [ ] **P5-07** Déploiement (§9.2) : Dockerfile multi-étapes (une image, deux commandes : `api` et `worker`), environnements staging et production, migrations, DNS wildcard, e-mails vérifiés (SPF/DKIM), sauvegardes Postgres (PITR) avec **test de restauration**.
- [ ] **P5-08** Runbooks `docs/runbooks/` : déploiement, rollback, restauration, rejeu d'une dead-letter, rotation des secrets.

**DoD phase 5 = MVP en production**
- Staging et production sont déployés.
- Le parcours e2e passe contre staging.
- Les tableaux de bord PostHog (activation, commandes) sont alimentés.
- Les alertes sont testées.
- La restauration de sauvegarde a été testée.

---

## 8. Stratégie de tests

| Niveau | Cible | Outils | Emplacement | Commande |
|---|---|---|---|---|
| Unitaire domaine | Agrégats, VO, stratégies, états | Vitest | `modules/*/domain/*.spec.ts` | `npm test` |
| Unitaire application | Use cases avec **repositories en mémoire** (`test/fakes/`) | Vitest | `modules/*/application/**/*.spec.ts` | `npm test` |
| Intégration | Repositories Prisma, extension tenant, outbox, réservation concurrente, Redis | Vitest + Testcontainers (Postgres 18, Redis 8) | `*.int-spec.ts` | `npm run test:int` |
| E2E API | Controllers + guards + filtres ; Clerk simulé par une clé JWT de test (`CLERK_JWT_KEY`) | Vitest + Supertest + Testcontainers | `apps/api/test/*.e2e-spec.ts` | `npm run test:e2e` |
| Front composants | Formulaires, éditeur de variantes, panier | Vitest + Testing Library | `*.test.tsx` | `npm test` |
| E2E navigateur | Parcours marchand et acheteur | Playwright + `@clerk/testing` | `e2e/` (racine) | `npm run e2e` |

**Objectifs** :
- couverture ≥ 90 % sur `domain/`, ≥ 80 % sur `application/` ;
- on ne cherche pas de couverture sur `infrastructure/` : les tests d'intégration la couvrent.

**Tests obligatoires** :
- **isolation tenant**, pour chaque module (boutique A ≠ boutique B) ;
- **concurrence** sur la réservation (P2) ;
- **idempotence** du checkout et du relais outbox ;
- toutes les **transitions** de commande.

**Données** :
- *Test Data Builders* (`aProduct().withVariants(3).build()`) dans `apps/api/test/builders/` ;
- `truncate` entre deux tests d'intégration.

---

## 9. CI/CD et déploiement

### 9.1 `ci.yml` (PR et `main`)
1. Checkout, `actions/setup-node` (Node 26, `cache: npm`), `npm ci`.
2. `npx turbo run lint typecheck test build` (avec cache Turbo) et `npm audit --audit-level=high`.
3. `npm run depcruise` (frontières).
4. `npx turbo run test:int test:e2e` (Testcontainers ; Docker est disponible sur `ubuntu-latest`).
5. Sur `main` uniquement : Playwright contre l'environnement éphémère ou staging (à partir de P5).

### 9.2 `deploy.yml` (sur `main`, après la CI)
| Cible | Hébergement recommandé | Étapes |
|---|---|---|
| API + worker | Railway (ou Render / Fly.io), région UE | Build de l'image `apps/api/Dockerfile` (`npx turbo prune @marche/api --docker`, puis `npm ci`, build et `npm prune --omit=dev` dans l'image), push sur GHCR, **`prisma migrate deploy`** (job de pré-déploiement), déploiement du service `api` (`node dist/main.js`) et du service `worker` (`node dist/worker.js`) |
| Postgres / Redis | Services managés Railway (Redis en `noeviction`) | Sauvegardes quotidiennes + PITR |
| Storefront | Vercel (projet `apps/storefront`) | Domaine wildcard `*.<domaine>` + domaine racine ; variables d'env ; `REVALIDATE_SECRET` |
| Dashboard | Vercel (statique, projet `apps/dashboard`) | `app.<domaine>` ; réécriture SPA vers `index.html` |
| Médias | Cloudflare R2 + domaine `media.<domaine>` | Bucket public en lecture, CORS limité au dashboard pour les `PUT` pré-signés |
| Tiers | Clerk (instance prod + DNS), PostHog Cloud EU, Resend (domaine vérifié) | Configuration une fois pour toutes, clés dans les secrets de la CI et des hébergeurs |

**Ordre de déploiement** : migrations → worker → API → fronts. Les migrations doivent rester **rétrocompatibles** (expand → contract) pour permettre un rollback de l'API sans rollback de la base.

---

## 10. Estimation et jalons
Charge **indicative** pour 1 développeur à temps plein, habitué à la stack :

| Phase | Charge | Jalon |
|---|---|---|
| P0 Fondations | 6 à 8 j | J1 : « je me connecte et je crée ma boutique » |
| P1 Catalogue | 8 à 10 j | J2 : catalogue complet dans le dashboard |
| P2 Inventaire | 3 à 4 j | J3 : stock fiable |
| P3 Commandes | 7 à 9 j | J4 : ERP utilisable en interne |
| P4 Site | 10 à 13 j | J5 : **démo « un clic → site en ligne → commande »** |
| P5 Prod | 6 à 8 j | J6 : MVP en production |
| **Total** | **≈ 40 à 52 j** | |

Le chemin critique passe par P0, P1, P2, P3 puis P4. Deux travaux peuvent avancer **en parallèle** dès P1 : la maquette du template (P4-08) et les templates d'e-mail (P3-06).

---

## 11. Prérequis externes et décisions ouvertes
| # | Élément | Nécessaire avant | Responsable |
|---|---|---|---|
| 1 | Compte **Clerk** (application dev), **Organizations activées**, rôles `admin`/`member` | P0-13 | Porteur du projet |
| 2 | **Maquette du template par défaut** (Figma ou autre), dans le cadre du contrat du §P4-01 | P4-08 (idéalement pendant P1–P2) | Porteur du projet |
| 3 | **Nom de domaine** de la plateforme | P5-07 (dev en `localhost`) | Porteur du projet |
| 4 | Comptes PostHog (EU), Resend, Cloudflare R2, Vercel, Railway | P5 (PostHog possible dès P0) | Porteur du projet |
| 5 | Confirmation des hypothèses 0.1 (paiement à la livraison, devise unique par boutique…) | P3 | Porteur du projet |
| 6 | Marché et moyens de paiement cibles pour la V2 (Stripe ? Mobile Money ? lesquels ?) | V2 | Porteur du projet |
| 7 | Mentions légales, CGV et politique de confidentialité par défaut des sites générés | P4-09 | Porteur du projet |

---

## 12. Risques et parades
| Risque | Impact | Parade |
|---|---|---|
| Fuite de données entre boutiques | Critique | Extension Prisma qui **échoue** sans tenant, SQL brut revu, tests d'isolation par module, RLS en V2 |
| Survente sous forte concurrence | Élevé | `UPDATE` conditionnel + contrainte `CHECK` + test de concurrence en CI |
| Effets de bord perdus ou en double (e-mails) | Moyen | Outbox transactionnelle + `jobId` déterministe + handlers idempotents |
| Écosystème Nest 12 encore jeune (peer deps) | Moyen | Dépendances vérifiées (§0.2), pipe Zod maison, mises à jour pilotées par la table des versions (§1) |
| Prisma 8 (RC) installé par erreur | Moyen | Version exacte `7.10.0` (sans `^`) dans `apps/api/package.json`, `npm ci` en CI (respect strict du lockfile) |
| Dérive de versions entre workspaces (pas de « catalog » avec npm) | Faible | Outils partagés déclarés à la racine, plages identiques pour les dépendances communes, contrôle avec `npm ls <paquet>` |
| Cache storefront périmé | Moyen | Tags fins, revalidation événementielle, prix et stock revérifiés au checkout (`PriceUnchanged`, `StockAvailable`) |
| Webhooks Clerk indisponibles en local | Faible | Création des utilisateurs à la volée ; tunnel (`cloudflared`) seulement pour tester les webhooks |
| Dérive des frontières de modules | Moyen | `dependency-cruiser` bloquant en CI, façades explicites, revue de PR |
| Template livré tard | Moyen | Contrat de template figé en P4-01, template provisoire fonctionnel, maquette attendue en parallèle |

---

**Prochaine action** : démarrer la **phase 0**, en commençant par P0-01 à P0-05 (monorepo, outillage, Docker).
