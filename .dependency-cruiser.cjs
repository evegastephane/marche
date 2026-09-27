/**
 * Frontières d'architecture vérifiées en CI (docs/PLAN-CODE.md P0-17).
 * Lancer : npm run depcruise
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internals',
      comment:
        "Un module n'importe d'un autre module que sa façade (<module>.facade.ts) : jamais ses dossiers domain, application, infrastructure ou interface.",
      severity: 'error',
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/([^/]+)/(domain|application|infrastructure|interface)/',
        pathNot: '^apps/api/src/modules/$1/',
      },
    },
    {
      name: 'domain-is-pure',
      comment: 'Le domaine ne dépend ni de Nest, ni de Prisma, ni des autres couches.',
      severity: 'error',
      from: {
        path: '^apps/api/src/(modules/[^/]+|shared)/domain/',
        pathNot: '\\.spec\\.ts$',
      },
      to: {
        path: [
          '^apps/api/src/(modules/[^/]+|shared)/(application|infrastructure|interface)/',
          '^apps/api/src/generated/',
          'node_modules/(@nestjs|@prisma|nestjs-cls|@nestjs-cls|bullmq|ioredis)/',
        ],
      },
    },
    {
      name: 'application-not-infrastructure',
      comment: "La couche application dépend de ports (classes abstraites), jamais d'adapters.",
      severity: 'error',
      from: {
        path: '^apps/api/src/(modules/[^/]+|shared)/application/',
        pathNot: '\\.spec\\.ts$',
      },
      to: {
        path: [
          '^apps/api/src/(modules/[^/]+|shared)/(infrastructure|interface)/',
          '^apps/api/src/generated/',
        ],
      },
    },
    {
      name: 'contracts-are-standalone',
      comment: 'Les contrats partagés ne dépendent d’aucune application.',
      severity: 'error',
      from: { path: '^packages/contracts/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-circular',
      comment: 'Pas de dépendances circulaires entre fichiers.',
      severity: 'error',
      from: { pathNot: '\\.spec\\.ts$' },
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['(^|/)dist/', '^apps/api/src/generated/'] },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
