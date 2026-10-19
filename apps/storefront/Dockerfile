# syntax=docker/dockerfile:1.7
#
# Image du storefront (sites des boutiques, Next.js en serveur autonome). À construire depuis la racine :
#
#   docker build -f apps/storefront/Dockerfile \
#     --secret id=storefront_env,src=apps/storefront/.env.local -t upsell-storefront .
#
# Les NEXT_PUBLIC_* sont figées au build. Les adresses viennent des arguments ci-dessous ; le reste
# (clé Clerk, PostHog…) est lu dans .env.local, monté en secret : il n'est jamais copié dans une couche.
# Après un changement de .env.local, reconstruire sans cache (le cache ignore le contenu des secrets).
# Les variables serveur (API_INTERNAL_URL, STOREFRONT_API_TOKEN…) se donnent au lancement.
# docker-compose.yml fait tout cela (service storefront).

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_FETCH_RETRIES=6 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
# Même npm que le poste de dev (champ packageManager) : npm 12 applique allowScripts.
RUN npm install -g npm@12.0.1
WORKDIR /repo

# 1. Monorepo élagué : le storefront et ses seuls paquets internes, avec un lockfile réduit.
FROM base AS prune
COPY . .
RUN npx --yes turbo@2.11.4 prune @marche/storefront --docker

# 2. Dépendances : couche en cache tant que les package.json et le lockfile ne bougent pas.
FROM base AS deps
COPY --from=prune /repo/out/json/ ./
COPY --from=prune /repo/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci

# 3. Build : paquets internes par Turborepo, puis Next hors Turborepo (son mode strict filtrerait NEXT_OUTPUT).
FROM deps AS build
COPY --from=prune /repo/out/full/ ./
ARG NEXT_PUBLIC_ROOT_DOMAIN=localhost:3001
ARG NEXT_PUBLIC_DASHBOARD_URL=http://localhost:5173
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_ROOT_DOMAIN=${NEXT_PUBLIC_ROOT_DOMAIN} \
    NEXT_PUBLIC_DASHBOARD_URL=${NEXT_PUBLIC_DASHBOARD_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npx turbo run build --filter=@marche/storefront^...
RUN --mount=type=secret,id=storefront_env,target=/repo/apps/storefront/.env.local,required=false \
    npm run build -w @marche/storefront \
    && rm -f apps/storefront/.next/standalone/apps/storefront/.env*

# 4. Image d'exécution : serveur autonome, fichiers statiques et dossier public.
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=node:node /repo/apps/storefront/public ./apps/storefront/public
USER node
EXPOSE 3001
CMD ["node", "apps/storefront/server.js"]
