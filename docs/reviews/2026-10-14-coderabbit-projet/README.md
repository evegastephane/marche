# Revue CodeRabbit du projet entier, morceau par morceau

Relu par : CodeRabbit CLI 0.9.0, avec vérification de chaque remarque dans le code par Claude. Date : 2026-10-14.
Branche `claude/catalogue-dynamique`, état actuel du dossier de travail (modifications non commitées et fichiers non suivis compris).

**Méthode.** CodeRabbit ne relit que des différences. Chaque morceau est donc comparé au tout premier commit (`cf1fc9a`, configuration de départ du monorepo), ou relu en entier via une copie de travail temporaire quand il regroupe plusieurs dossiers. Le quota gratuit est de 3 revues par heure : les morceaux s'enchaînent dans cet ordre, du plus sensible au moins sensible.

**Verdicts.** « Confirmé » : le problème existe dans le code actuel. « Défense en profondeur » : le problème est réel dans le fichier, mais une autre couche l'empêche déjà. « Non fondé » : la remarque repose sur une hypothèse fausse. La gravité est celle donnée par CodeRabbit, sans retouche.

## Avancement

| # | Morceau | Lignes | Remarques | Confirmées |
|---|---------|-------:|----------:|-----------:|
| 1 | API : `src/shared` (auth, isolation des boutiques, config, files) | 2 600 | 5 | 5 |
| 2 | API : module `orders` (commandes et caisse) | 4 200 | 5 | 3 |
| 3 | API : module `catalog` | 8 100 | 1 | 1 |
| 4 | API : identity, stores, developers, checkout, storefront, sites, fichiers racine | 4 100 | 3 | 2 |
| 5 | API : inventory, devices, media, campaigns, notifications, analytics, reporting | 4 700 | 3 | 3 |
| 6 | API : schéma Prisma, migrations, seed et tests e2e | 7 100 | 1 | 1 |
| 7 | Paquets partagés : contracts, emails, config | 6 300 | 5 | 4 |
| 8 | Dashboard : caisse, `shared`, `app`, point d’entrée, Dockerfile et nginx | 5 300 | 5 | 4 + 1 plausible |
| 9 | Dashboard : produits, catégories, verticales, stock | 5 500 | 6 | 6 |
| 10 | Dashboard : site, commandes, médias, coque et autres écrans | 4 100 | 4 | 4 |
| 11 | Dashboard : `routes` | 6 800 | 6 | 6 |
| 12 | Storefront : pages, actions serveur, `lib`, composants boutique | 5 700 | 4 | 4 |
| 13 | Storefront : page d’accueil, plateforme, développeurs | 6 700 | en cours | |
| 14 | Storefront : templates de sites | 7 600 | à venir | |

## 1. API : `src/shared`

56 fichiers relus, 5 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| minor | `infrastructure/http/idempotency.interceptor.ts:88` | `catchError` est placé après l'écriture du résultat `done`. Si cette écriture Redis échoue après un traitement réussi, la clé est supprimée et une erreur est renvoyée. Le client réessaie alors avec la même clé, et la commande est créée deux fois. | Confirmé. Peu probable (panne Redis juste à ce moment), mais l'effet est une commande en double. |
| minor | `infrastructure/http/idempotency.interceptor.ts:59` | La réservation `processing` dure 24 h. Si le processus s'arrête en pleine requête (déploiement, manque de mémoire), toute nouvelle tentative avec la même clé reçoit 409 pendant 24 h. | Confirmé. Une réservation de quelques minutes suffit, le résultat `done` gardant ses 24 h. |
| minor | `infrastructure/prisma/tenant-scope.ts:86` | `update`, `updateMany` et la partie `update` d'`upsert` ne contrôlent que `where`, pas `data`. Un `data: { storeId: 'autre' }` déplacerait la ligne vers une autre boutique, alors que `create` refuse ce cas. | Confirmé, en défense en profondeur : aucun appel actuel ne passe un `storeId` venu du client. Le proxy promet pourtant de couvrir les écritures. |
| minor | `infrastructure/config/app-config.ts:96` | En production, rien n'oblige à définir `DASHBOARD_URL` (valeur par défaut `http://localhost:5173`). Sans elle, tous les liens des e-mails pointeraient vers localhost, et le démarrage ne signalerait aucune erreur. | Confirmé. |
| minor | `application/unit-of-work.port.ts:7` | Le commentaire annonce un délai de 5 s par défaut, alors que `cls.module.ts` fixe 15 s (5 s, c'est `maxWait`). | Confirmé (commentaire seulement). |

## 2. API : module `orders`

25 fichiers relus (dont la caisse, non commitée), 5 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `infrastructure/prisma-order.repositories.ts:146` | `update` supprime puis recrée toutes les lignes de commande, ce qui casserait les retours et le stock qui pointent vers elles. | Non fondé. C'est voulu et documenté dans `schema.prisma` : `OrderReturnLine.orderLineId` et `StockUnit.orderLineId` n'ont pas de clé étrangère, et `writeLines` réutilise les mêmes identifiants. |
| major | `domain/order-return.policy.ts:70` | Une demande de retour qui cite deux fois la même ligne passerait la vérification des quantités et gonflerait le stock. | Défense en profondeur. `posReturnSchema` (`packages/contracts/src/pos.ts:306`) refuse déjà une ligne présente deux fois, et la caisse est le seul appelant. |
| minor | `infrastructure/prisma-order.repositories.ts:216` | À la caisse, un client est retrouvé par téléphone dès 6 chiffres. Avec 6 ou 7 chiffres, `LIKE '%' \|\| suffixe` accroche n'importe quel numéro qui se termine pareil, puis écrase le prénom et le nom de ce client. | Confirmé. Le commentaire parle de 8 chiffres, mais le seuil est à 6. |
| minor | `infrastructure/prisma-order.repositories.ts:202` | Le repli sur violation d'unicité d'`upsertByEmail` ne peut pas marcher : dans une transaction interactive, PostgreSQL annule tout après l'erreur, et le `findFirst` qui suit échoue à son tour en masquant l'erreur d'origine. | Confirmé. |
| minor | `infrastructure/prisma-order.repositories.ts:263` | `optOutWhatsApp` agit sur toutes les boutiques sans contrôler le suffixe. Un suffixe vide désinscrirait tous les clients de toutes les boutiques. | Défense en profondeur. Le suffixe vient de `phoneSuffix(message.from)` (9 derniers chiffres), dans un webhook dont la signature Meta est vérifiée. Un contrôle de longueur ne coûte rien. |

## 3. API : module `catalog`

43 fichiers relus, 1 remarque. La première tentative a été interrompue par une coupure de connexion chez CodeRabbit, et la seconde est allée au bout.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| minor | `application/catalog-import/catalog-import.use-case.ts:663` | `step()` transforme toute erreur en `ImportStepError`, et `run()` la renvoie en 422 `IMPORT_REJECTED` avec son message. Une panne Prisma ou de connexion arrive donc au client avec les noms de tables et de contraintes. Elle passe pour une erreur dans le fichier importé, et n'atteint ni le gestionnaire 500 ni les journaux. | Confirmé (ligne 183 : tout `Error` est renvoyé tel quel). Il faut n'envelopper que les `DomainError` ; la transaction est annulée dans les deux cas. |

## 4. API : identity, stores, developers, checkout, storefront, sites, fichiers racine

58 fichiers relus en entier (groupe), 3 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| minor | `modules/checkout/domain/checkout-validation.ts:21` | `StoreClosedError` utilise le même code que `CartChangedError` (`CART_CHANGED`), sans `changes`. Quand la boutique n'accepte pas de commande (site non publié, aperçu), l'acheteur lit qu'il doit revoir son panier. | Confirmé. `apps/storefront/src/actions/checkout.ts:65` affiche alors « Votre panier a changé (prix ou stock) ». Un code distinct (`STORE_CLOSED`) est à ajouter aussi dans `packages/contracts/src/common.ts`. |
| minor | `modules/stores/stores.facade.ts:116` | `archiveByClerkOrg` vide le cache de la boutique dans la transaction, donc avant la validation. Une requête qui arrive entre les deux peut remettre en cache « non archivée » pour 300 s, et `TenantGuard` laisse encore entrer les membres. | Confirmé. Les deux autres cas (`create-store.use-case.ts:57`, `current-store.use-cases.ts:48`) vident bien le cache après la transaction. La fenêtre est courte. |
| minor | `modules/storefront/application/storefront.queries.ts:33` | `groupPairs` ne vérifie pas la présence du `:`. `a=rouge` donnerait la clé `roug`. | Non fondé. `facetPairs` (`packages/contracts/src/storefront.ts:21`) impose déjà `clé:valeur` par regex. |

## 5. API : inventory, devices, media, campaigns, notifications, analytics, reporting

47 fichiers relus en entier (groupe), 3 remarques. Une première tentative a été coupée par CodeRabbit (« WebSocket closed »), et la seconde est allée au bout.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `modules/campaigns/domain/whatsapp.ts:43` | `toWhatsAppNumber` retire le `0` initial de tout numéro national. Ce n'est juste que là où le `0` est un préfixe interurbain (France, Belgique, Maroc). En Côte d'Ivoire (numéros à 10 chiffres depuis 2021), `07 07 07 07 07` devient `225707070707` au lieu de `2250707070707`. Même problème au Bénin (`+229 01…` depuis 2024) et au Congo (`+242 06…`). | Confirmé. Tous les clients ivoiriens saisis au format national reçoivent un numéro faux : Meta refuse l'envoi, ou le message part chez quelqu'un d'autre. `whatsapp.spec.ts` ne teste que SN et FR. Il faut ne retirer le `0` que pour FR, BE et MA, puis vérifier les plans de numérotation des autres pays de la liste. |
| minor | `modules/devices/application/device.use-cases.ts:49` | Si MobileAPI échoue (quota épuisé, refus, réseau), l'exception `ServiceUnavailableException` sort de `search`. Le marchand reçoit une 503 et perd les résultats du catalogue local déjà trouvés. | Confirmé. Il faut garder les résultats locaux et renvoyer `online: false`. |
| minor | `modules/campaigns/infrastructure/prisma-campaign.repository.ts:93` | `applyStatus` lit le statut puis écrit le nouveau sans condition. Deux notifications Meta simultanées (`delivered` et `read`) peuvent faire reculer un message de `READ` à `DELIVERED`, et le compteur de lectures de la campagne est alors trop bas. | Confirmé. Ajouter `status: message.status` au `where` de l'`updateMany` suffit : une écriture périmée ne touche alors aucune ligne. |

## 6. API : schéma Prisma, migrations, seed et tests e2e

47 fichiers relus en entier (groupe, avec les migrations SQL et les `down.sql`), 1 remarque. Rien à signaler sur le schéma, les migrations ou le seed.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| minor | `test/support/test-app.ts:193` | Les fichiers e2e tournent en parallèle sur un même Redis. Le worker de `worker.e2e-spec.ts` lance de vrais processeurs BullMQ, sans remplacer `WhatsAppSender` ni `RemoteImageFetcher`. Il peut donc prendre les jobs des autres fichiers, par exemple l'envoi d'une campagne, et les exécuter avec le vrai client Meta. | Confirmé. Postgres et Redis sont partagés par tous les fichiers (`global-setup.ts`), `vitest.config.e2e.ts` laisse le parallélisme par défaut, et le lancement d'une campagne passe par l'outbox puis la file `campaigns`. Le risque est un test de campagne qui échoue de temps en temps. Deux solutions : `fileParallelism: false`, ou un préfixe BullMQ par application de test. Dans les deux cas, remplacer aussi les deux adaptateurs externes dans le worker de test. |

## 7. Paquets partagés : `contracts`, `emails`, `config`

50 fichiers relus, 5 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `contracts/src/storefront-vocabulary.ts:119` | `modelKey` utilise `/s+/g` au lieu de `/\s+/g` : la fonction remplace les « s » minuscules par une espace et ne réduit pas les espaces multiples. | Confirmé, avec un effet visible. `compatibleAccessoryIds` (`prisma-catalog-storefront.read-model.ts:398`) compare cette clé à celle calculée en SQL, qui utilise bien `\s+`. Pour tout modèle qui contient un « s » minuscule (« iPhone 15 Plus » donne `iphone 15 plu`, « Galaxy Buds »…), les accessoires compatibles n'apparaissent plus sur la fiche. |
| major | `contracts/src/imports.ts:50` | `parseImageUrls` ne contrôle l'hôte que par `hostname.includes('.')`. `https://169.254.169.254/…` et `https://10.0.0.5/…` passent, et l'import télécharge ces liens (SSRF). | Défense en profondeur. `https-remote-image-fetcher.ts` bloque déjà les plages privées, de bouclage, link-local et réservées, après résolution DNS (`safeLookup`), ainsi que les IP littérales internes (ligne 167). Refuser les IP littérales dès le contrat ne ferait qu'ajouter une couche, et rendrait le message d'erreur plus clair. |
| minor | `contracts/src/catalog.ts:42` (et `taxonomy.ts:72`, `taxonomy.ts:189`) | `z.coerce.boolean()` lit la chaîne `"false"` comme `true`. | Confirmé, avec un effet visible. `features/brands/api.ts:15` envoie `includeArchived` tel quel, et `toQuery` en fait `includeArchived=false` : la liste des marques affiche donc toujours les marques archivées. Les catégories échappent au problème (`includeArchived \|\| undefined`). Remède : `z.stringbool()`. |
| minor | `contracts/src/catalog.ts:84` | `optionValueSchema.max(80)` laisse en place le `.max(40)` d'origine, alors qu'une valeur d'attribut peut faire 80 caractères (`taxonomy.ts:126`). Une valeur d'axe de 41 à 80 caractères fait donc refuser toute variante qui l'utilise. | Confirmé. |
| minor | `contracts/src/templates/theme.ts:60` | `linkSchema` prend `//site.externe/…` et `/\site.externe` pour des liens internes : le navigateur les ouvre sur un autre site. | Confirmé. Portée limitée : c'est le marchand qui saisit ces liens sur son propre site, et il peut déjà mettre un lien `https://`. Seule la règle « lien interne » n'est pas tenue. |

## 8. Dashboard : caisse, `shared`, `app`, point d'entrée, Dockerfile et nginx

48 fichiers relus en entier (groupe), 5 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `shared/ui/dialog.tsx:53` | Sur téléphone, `drag="y"` s'applique à tout le panneau, qui est aussi la zone qui défile (`overflow-y-auto`). Motion y pose un `touch-action` restrictif : un glissement vertical devient un geste de fermeture au lieu d'un défilement. Un contenu plus haut que `88dvh` ne défile donc plus. | Confirmé. Toutes les fenêtres du dashboard sont touchées sur téléphone : comptage de caisse à la fermeture, retours, paiement. Le bouton de validation peut rester hors d'atteinte. Remède : `useDragControls` avec `dragListener={false}`, et lancer le geste depuis la poignée seulement (ligne 60). |
| minor | `features/pos/print.tsx:37` | Le nettoyage forcé à 300 ms suppose que `window.print()` bloque jusqu'à la fermeture de la fenêtre d'impression. Sur mobile et tablette, l'appel rend la main tout de suite : le ticket est retiré pendant que la fenêtre est encore ouverte, et l'impression peut sortir vide. | Plausible, à tester sur la tablette de caisse. Le délai de 300 ms part à chaque fois, même quand `afterprint` existe. |
| minor | `features/pos/payment-dialog.tsx:107` | `creditTooLow` ne compare que le paiement en cours au solde de l'avoir. Deux paiements « échange » sur le même avoir peuvent donc chacun prendre la totalité du solde. | Confirmé côté interface seulement. L'API refuse la vente (`consumeCredit` conditionnel, `prisma-pos.repositories.ts:178`), mais le caissier ne le découvre qu'à la validation. |
| minor | `features/pos/ticket-dialogs.tsx:186` | Une remise de plus de 100 % affiche « Valeur invalide », mais le bouton « Appliquer » reste actif pour un administrateur (`maxPercent` vaut `null`). | Confirmé côté interface seulement. L'API refuse au-delà de 100 % (`packages/contracts/src/pos.ts:162`). |
| minor | `features/pos/sales-dialogs.tsx:46` | Il manque le « ne » de la négation : « Aucune vente en caisse porte le numéro… ». | Confirmé (texte). |

## 9. Dashboard : produits, catégories, verticales, stock

28 fichiers relus en entier (groupe), 6 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| critical | `features/products/api.ts:66` | Pour un nouveau produit, le `POST /products` peut réussir puis le `POST /publish` échouer. La mutation échoue, le formulaire reste en mode « nouveau produit », et le cache n'est pas mis à jour. À la tentative suivante, un nouveau `POST` part : les SKU appartiennent déjà au produit tout juste créé, donc le formulaire bloque sur « Déjà pris par un autre produit ». Avec d'autres SKU, un second produit est créé. | Confirmé. La publication échoue dans un cas courant : un attribut obligatoire de la catégorie manque (`product.aggregate.ts:423`, `PRODUCT_NOT_PUBLISHABLE`). `useSkuCheck` exclut `product?.id`, qui reste `undefined`. Remède : récupérer le produit créé même quand la publication échoue (mettre à jour le cache, ouvrir sa page d'édition), ou créer le produit directement avec son statut final. |
| major | `features/categories/attributes-view.tsx:332` | Le sélecteur de couleur envoie un `PATCH` à chaque événement `input`, donc des dizaines pendant que l'on fait glisser le curseur. Chaque réponse rafraîchit la taxonomie et remonte la ligne (sa clé contient `swatch`), ce qui peut fermer le sélecteur. Les requêtes arrivant dans le désordre, la couleur enregistrée n'est pas forcément la dernière choisie. | Confirmé. Garder la couleur en état local, et ne l'enregistrer qu'au `blur` ou à l'événement natif `change`. |
| minor | `features/inventory/dialogs.tsx:196` | « Annuler » appelle `onClose` sans `reset()`. La fenêtre reste montée et se rouvre, pour un autre article, avec le type, le sens, la quantité et le motif précédents. | Confirmé. Les deux autres chemins de fermeture (lignes 90 et 103) appellent bien `reset()`. Risque : enregistrer un mouvement de stock faux. |
| minor | `features/products/product-form.tsx:171` | « Fiche remplie » s'affiche avant que `applyDevice` ait abouti. Si l'ajout des valeurs manquantes échoue, la promesse (`void`) est rejetée sans aucun message, et le brouillon n'a pas changé. | Confirmé. |
| minor | `features/categories/api.ts:121` | `useTaxonomyMutation` ne rafraîchit la taxonomie qu'en cas de succès. Si l'ajout de plusieurs valeurs échoue en cours de route, les premières sont enregistrées mais n'apparaissent pas, et l'utilisateur ne peut pas recommencer (doublons refusés). | Confirmé. Passer l'invalidation dans `onSettled`. |
| minor | `features/categories/categories-view.tsx:158` | Le déplacement d'une catégorie envoie un `PATCH` par catégorie sœur, sans `onError`. Un échec partiel laisse un ordre mélangé, sans aucun message. | Confirmé. Les autres mutations du fichier affichent bien `toast.error`. |

## 10. Dashboard : site, commandes, médias, coque et autres écrans

29 fichiers relus en entier (groupe), 4 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `features/orders/api.ts:107` | La clé d'idempotence est tirée dans `mutationFn` : chaque nouvelle tentative de l'utilisateur en reçoit une nouvelle, et le serveur ne reconnaît pas le doublon. Le `POST` du brouillon n'est pas idempotent non plus. Même chose dans `usePlaceOrder` (ligne 137). | Confirmé, avec une nuance. Si `place` échoue dans `useCreateOrder`, chaque nouvelle tentative crée un brouillon de plus, puis le passe : il peut en résulter deux commandes. Dans `usePlaceOrder`, un brouillon déjà passé serait refusé par sa transition d'état, d'où un message d'erreur trompeur, mais pas de double réservation. Remède : tirer la clé une fois par intention (dans les variables de la mutation), et réutiliser le brouillon déjà créé. |
| minor | `features/orders/serials-dialog.tsx:16` | `looksLikeBadImei` signale comme « mal recopié » tout numéro de 9 à 14 chiffres, ou de plus de 15. Beaucoup de numéros de série valides sont numériques sans être des IMEI. | Confirmé : `return digits.length > 8` ligne 16. |
| minor | `features/shell/app-shell.tsx:185` | Le texte pour lecteur d'écran dit toujours « à expédier », y compris sur le badge des demandes (« Demandes 3 à expédier »). Même chose ligne 332. | Confirmé (accessibilité). |
| minor | `features/media/media-gallery.tsx:186` | L'aide indique « JPEG, PNG ou WebP », alors que l'AVIF est accepté (`accept` lignes 177 et 288). | Confirmé (texte). |

## 11. Dashboard : `routes`

28 fichiers relus, 6 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| major | `routes/_app/pos/index.tsx:124` | Si le calcul du total (devis) échoue pour une autre raison que `DISCOUNT_NOT_ALLOWED` ou `ITEM_UNAVAILABLE` (réseau, erreur serveur), `quoteError` vaut `null` et `pricing` repasse à faux. « Encaisser » ouvre alors le paiement avec `ticket.subtotal` : un ticket remisé affiche le montant sans la remise. | Confirmé (lignes 114 à 124). Il ne faut encaisser qu'avec un devis réussi pour le ticket actuel, et afficher toute erreur de devis avec un bouton « Réessayer ». |
| major | `routes/_app/site.tsx:254` | « Mettre hors ligne » reste cliquable pendant `saveDraft()`. Le second `mutate` remplace les rappels de l'enregistrement, que TanStack n'exécute que pour le dernier appel : `busy` ne revient jamais à `null`, et « Enregistrer » et « Publier » restent grisés jusqu'au rechargement. | Confirmé. `useSiteAction` est une mutation TanStack standard (`features/site/api.ts:52`), et le bouton n'a pas de `disabled`. |
| major | `routes/_app/site.tsx:174` | Les réglages du thème restent modifiables pendant l'enregistrement. Une retouche faite pendant ce temps est marquée comme enregistrée (`setDirty(false)`) alors que la requête contenait l'ancienne version. « Publier » saute alors l'enregistrement de cette retouche. | Confirmé : seuls les deux boutons (lignes 513 et 521) regardent `busy`. |
| minor | `routes/_app/settings.tsx:65` | Si le chargement du logo échoue, le formulaire s'ouvre sans logo, et le prochain enregistrement d'un autre réglage envoie `logoMediaId: null` : le logo est supprimé. | Confirmé (ligne 53 : seul `isPending` est testé, pas l'erreur). |
| minor | `routes/_app/products/import.tsx:78` | Si l'on change de fichier pendant la vérification, la réponse du premier fichier s'affiche pour le second, et « Importer » envoie le second avec le rapport du premier. | Confirmé côté interface. L'import revérifie tout côté serveur (`catalog-import.use-case.ts`), donc aucune donnée fausse n'est écrite. |
| minor | `routes/_app/pos/index.tsx:51` | En cas d'erreur des réglages de caisse, « Réessayer » ne relance que la session (`current.refetch()`) : le caissier reste bloqué sur l'écran d'erreur. | Confirmé. |

## 12. Storefront : pages, actions serveur, `lib`, composants boutique

55 fichiers relus en entier (groupe, avec `proxy.ts`, `next.config.ts` et le Dockerfile), 4 remarques.

| Gravité | Fichier | Remarque | Verdict |
|---------|---------|----------|---------|
| minor | `lib/storefront-api.ts:156` | `cartId` (lu dans un cookie que le visiteur contrôle) et `variantId` sont insérés sans encodage dans le chemin de l'API (lignes 156, 172, 174, 178, 180). Une valeur comme `../checkout` change la route appelée. | Confirmé. Le cookie n'est jamais validé (`actions/cart.ts:25`, `actions/checkout.ts:24`), et `fetch` résout les `..`. L'appel part du serveur avec le jeton storefront : un visiteur peut donc atteindre d'autres routes `/storefront/v1` que celles exposées par les pages. `encodeURIComponent` ne suffit pas, car il laisse passer un `..` nu : il faut valider `cartId` et `variantId` comme des UUID. |
| minor | `components/preview-bridge.tsx:20` | Le pont avec l'éditeur ne vérifie ni `event.origin` ni `event.source`, et répond avec `postMessage(…, '*')`. Toute page qui encadre le site peut lui envoyer `navigate` ou `refresh`. | Confirmé, portée limitée : la navigation reste dans le site, et le chemin renvoyé n'est pas confidentiel. Aucune règle `frame-ancestors` ni `X-Frame-Options` n'existe dans le storefront : n'importe quel site peut l'encadrer. Il faut n'accepter que `window.parent` avec l'origine du dashboard. |
| minor | `app/s/[site]/preview/exit/route.ts:7` | « Quitter l'aperçu » ne supprime que `PREVIEW_COOKIE`, et sans les attributs `Partitioned; SameSite=None; Secure` posés par `preview/embed/route.ts:13`. Le navigateur peut garder le cookie partitionné, et `EMBED_COOKIE` reste posé : une prochaine session d'aperçu peut alors masquer le bandeau de consentement à tort. | Confirmé. |
| minor | `components/shop/filters.tsx:126` | Le formulaire de prix ne renvoie que `kind`, `o` et `a` : la marque et le tri choisis sont perdus. L'unité affiche `€` pour toute devise autre que XOF, y compris XAF (F CFA) et MAD (dirham). | Confirmé. |
