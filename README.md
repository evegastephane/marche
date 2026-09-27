# marche

**Marché** : ERP e-commerce SaaS « à la Shopify ». Un marchand gère ses marques, produits, stock, catalogues et commandes, puis génère son site web en un clic.

- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Plan d'implémentation : [`docs/PLAN-CODE.md`](docs/PLAN-CODE.md)

## Stack

| Couche | Technologies |
|---|---|
| API et worker | NestJS 12, Prisma 7 (PostgreSQL 18), Redis 8, BullMQ, Clerk, PostHog |
| Dashboard (à venir) | React + Vite, TanStack, Tailwind CSS v4, shadcn/ui, Motion |
| Sites générés (à venir) | Next.js 16, multi-tenant par sous-domaine |
| Outillage | npm workspaces, Turborepo, Vitest, Testcontainers, oxlint |

## Structure

```
apps/api            API NestJS (HTTP) + worker BullMQ
packages/contracts  schémas Zod et types partagés front/back
packages/emails     templates d'e-mails transactionnels
packages/config     configurations TypeScript partagées
docs/               architecture et plan de code
```

## Démarrer en local

Prérequis : Node 26, npm 12 et Docker Desktop.

```bash
npm install
npm run infra:up
cp apps/api/.env.example apps/api/.env
npm run db:migrate -w @marche/api
npm run dev
```

Services locaux : API `http://localhost:3000` (Swagger sur `/docs`), Postgres sur le port 5434, Redis 6379, stockage S3 (RustFS) 9000, Mailpit `http://localhost:8025`.

## Vérifications

```bash
npm run build && npm run lint && npm run typecheck && npm test
```

```bash
npm run test:e2e -w @marche/api
```

Les tests e2e démarrent leurs propres PostgreSQL et Redis avec Testcontainers : Docker doit tourner.
