# syntax=docker/dockerfile:1.7
#
# Image du dashboard marchand (React + Vite), servie par nginx. À construire depuis la racine :
#
#   docker build -f apps/dashboard/Dockerfile \
#     --secret id=dashboard_env,src=apps/dashboard/.env.local -t upsell-dashboard .
#
# Les VITE_* sont figées au build. Les adresses viennent des arguments ci-dessous ; la clé Clerk
# est lue dans .env.local, monté en secret : il n'est jamais copié dans une couche.
# Après un changement de .env.local, reconstruire sans cache (le cache ignore le contenu des secrets).
# docker-compose.yml fait tout cela (service dashboard).

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_FETCH_RETRIES=6 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
# Même npm que le poste de dev (champ packageManager) : npm 12 applique allowScripts.
RUN npm install -g npm@12.0.1
WORKDIR /repo

# 1. Monorepo élagué : le dashboard et ses seuls paquets internes, avec un lockfile réduit.
FROM base AS prune
COPY . .
RUN npx --yes turbo@2.11.4 prune @marche/dashboard --docker

# 2. Dépendances : couche en cache tant que les package.json et le lockfile ne bougent pas.
FROM base AS deps
COPY --from=prune /repo/out/json/ ./
COPY --from=prune /repo/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci

# 3. Build : paquets internes par Turborepo, puis Vite. Les variables déjà présentes dans
#    l'environnement priment sur .env.local : les adresses des arguments l'emportent.
FROM deps AS build
COPY --from=prune /repo/out/full/ ./
ARG VITE_API_URL=http://localhost:3000
ARG VITE_PLATFORM_ROOT_DOMAIN=localhost:3001
ARG VITE_SITE_URL_SCHEME=http
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_PLATFORM_ROOT_DOMAIN=${VITE_PLATFORM_ROOT_DOMAIN} \
    VITE_SITE_URL_SCHEME=${VITE_SITE_URL_SCHEME}
RUN npx turbo run build --filter=@marche/dashboard^...
RUN --mount=type=secret,id=dashboard_env,target=/repo/apps/dashboard/.env.local,required=false \
    npm run build -w @marche/dashboard

# 4. Fichiers statiques servis par nginx, avec repli sur index.html pour le routage côté client.
FROM nginx:1.29-alpine AS runtime
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
