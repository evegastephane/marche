import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}

const apiRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Démarre une base PostgreSQL 18 et un Redis 8 jetables (Testcontainers),
 * applique les migrations Prisma et transmet les URL aux tests.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const [postgres, redis]: [StartedPostgreSqlContainer, StartedRedisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('marche')
      .withUsername('marche')
      .withPassword('marche')
      .start(),
    new RedisContainer('redis:8-alpine')
      .withCommand(['redis-server', '--maxmemory-policy', 'noeviction'])
      .start(),
  ]);

  const databaseUrl = postgres.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  project.provide('databaseUrl', databaseUrl);
  project.provide('redisUrl', redis.getConnectionUrl());

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
