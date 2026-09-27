# syntax=docker/dockerfile:1.7
#
# Image de l'API et du worker : même code, deux commandes. À construire depuis la racine du dépôt.
#
#   docker build -f apps/api/Dockerfile -t marche-api .
#   API    : docker run --env-file … -p 3000:3000 marche-api
#   Worker : docker run --env-file … marche-api node dist/worker.js
#
# Migrations (à lancer avant de déployer une nouvelle version) :
#   docker build -f apps/api/Dockerfile --target migrate -t marche-migrate .
#   docker run -e DATABASE_URL=… marche-migrate

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
# Même npm que le poste de dev (champ packageManager) : npm 12 applique allowScripts.
RUN npm install -g npm@12.0.1
WORKDIR /repo

# 1. Monorepo élagué : l'API et ses seuls paquets internes, avec un lockfile réduit.
FROM base AS prune
COPY . .
RUN npx --yes turbo@2.11.4 prune @marche/api --docker

# 2. Toutes les dépendances : couche en cache tant que les package.json et le lockfile ne bougent pas.
FROM base AS deps
COPY --from=prune /repo/out/json/ ./
COPY --from=prune /repo/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci

# 3. Build : paquets internes (tsc), client Prisma, puis Nest, dans l'ordre des dépendances (Turborepo).
#    Prisma exige DATABASE_URL pour charger sa config, même pour generate : une valeur factice suffit.
FROM deps AS build
COPY --from=prune /repo/out/full/ ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npx turbo run build --filter=@marche/api

# 4. Migrations : CLI Prisma + moteur de schéma. npm 12 bloque le téléchargement du moteur
#    à l'installation (allowScripts) : on le lance ici explicitement, pour la plateforme de l'image.
FROM build AS migrate
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && node node_modules/@prisma/engines/scripts/postinstall.js
WORKDIR /repo/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]

# 5. Image d'exécution : dépendances de production et code compilé uniquement.
#    (La CLI Prisma y reste : npm la classe en production car c'est un pair optionnel de @prisma/client.)
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prune /repo/out/json/ ./
COPY --from=prune /repo/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=build /repo/packages/contracts/dist packages/contracts/dist
COPY --from=build /repo/packages/emails/dist packages/emails/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
