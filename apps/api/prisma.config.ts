import { defineConfig, env } from 'prisma/config';

// Prisma 7 ne charge plus .env automatiquement : on utilise le chargeur natif de Node.
try {
  process.loadEnvFile('.env');
} catch {
  // Pas de fichier .env (CI, production) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
