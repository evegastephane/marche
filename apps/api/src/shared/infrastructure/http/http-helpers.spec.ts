import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { claimsFromPayload } from '../../../modules/identity/infrastructure/clerk-adapters.js';
import { subdomainFrom } from '../../../modules/storefront/interface/storefront.guard.js';
import { ConflictError, NotFoundError } from '../../domain/domain-error.js';
import { loadConfig } from '../config/app-config.js';
import { throttleTracker } from '../throttling/throttling.module.js';
import { toProblem } from './problem-details.js';
import { RequestValidationError } from './zod-validation.js';

describe('toProblem (RFC 9457)', () => {
  it('traduit les erreurs métier', () => {
    expect(toProblem(new NotFoundError('Produit', 'p1'))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(toProblem(new ConflictError('SKU_TAKEN', 'pris', { skus: ['A'] }))).toMatchObject({
      status: 409,
      code: 'SKU_TAKEN',
      details: { skus: ['A'] },
    });
    expect(toProblem(new RequestValidationError([{ path: 'title', message: 'requis' }]))).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      errors: [{ path: 'title', message: 'requis' }],
    });
  });

  it('reprend le code des exceptions HTTP et masque le détail des erreurs 500', () => {
    expect(toProblem(new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'x' }))).toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      detail: 'x',
    });
    expect(toProblem(new ForbiddenException())).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    const internal = toProblem(new Error('secret de base de données'));
    expect(internal).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(internal)).not.toContain('secret');
  });
});

describe('subdomainFrom', () => {
  it.each([
    ['chez-awa', 'chez-awa'],
    ['chez-awa.marche.app', 'chez-awa'],
    ['Chez-Awa.localhost:3001', 'chez-awa'],
    ['evil.com', null],
    ['a.b.marche.app', null],
  ])('%s → %s', (host, expected) => {
    const root = host.includes('localhost') ? 'localhost:3001' : 'marche.app';
    expect(subdomainFrom(host, root)).toBe(expected);
  });
});

describe('claimsFromPayload', () => {
  it('lit les claims d’organisation v2 et v1', () => {
    expect(claimsFromPayload({ sub: 'user_1', o: { id: 'org_1', rol: 'admin', slg: 'shop' } })).toEqual({
      sub: 'user_1',
      orgId: 'org_1',
      orgRole: 'admin',
      orgSlug: 'shop',
    });
    expect(claimsFromPayload({ sub: 'user_1', org_id: 'org_2', org_role: 'org:member' })).toMatchObject({
      orgId: 'org_2',
      orgRole: 'member',
    });
    expect(claimsFromPayload({ sub: 'user_1' }).orgId).toBeUndefined();
  });
});

describe('throttleTracker', () => {
  const config = loadConfig({
    DATABASE_URL: 'postgresql://x',
    REDIS_URL: 'redis://x',
    S3_BUCKET: 'b',
    S3_ACCESS_KEY_ID: 'k',
    S3_SECRET_ACCESS_KEY: 's',
    MEDIA_PUBLIC_BASE_URL: 'http://media.test',
    EMAIL_PROVIDER: 'log',
    STOREFRONT_API_TOKEN: 'storefront-token-0123456789',
    STOREFRONT_INTERNAL_URL: 'http://storefront.test',
    REVALIDATE_SECRET: 'revalidate-secret-0123456',
    PREVIEW_TOKEN_SECRET: 'preview-secret-01234567',
    PLATFORM_ROOT_DOMAIN: 'marche.test',
  });

  it('utilise l’IP transmise par le storefront seulement si son jeton est valide', () => {
    expect(
      throttleTracker(
        { ip: '10.0.0.1', headers: { 'x-client-ip': '203.0.113.9', 'x-storefront-token': config.storefront.apiToken } },
        config,
      ),
    ).toBe('storefront:203.0.113.9');
    expect(throttleTracker({ ip: '10.0.0.1', headers: { 'x-client-ip': '203.0.113.9' } }, config)).toBe('10.0.0.1');
  });
});
