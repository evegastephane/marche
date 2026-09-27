import { describe, expect, it } from 'vitest';
import { scopeArgs, TenantViolationError } from './tenant-scope.js';

const STORE = 'store-a';

describe('scopeArgs (isolation multi-tenant)', () => {
  it.each(['findMany', 'findFirst', 'findUnique', 'count', 'updateMany', 'deleteMany', 'update', 'delete'])(
    'ajoute storeId au filtre de %s',
    (operation) => {
      expect(scopeArgs(operation, { where: { id: 'p1' } }, STORE)).toEqual({ where: { id: 'p1', storeId: STORE } });
    },
  );

  it('crée un filtre quand il n’y en a pas', () => {
    expect(scopeArgs('findMany', undefined, STORE)).toEqual({ where: { storeId: STORE } });
  });

  it('ajoute storeId aux données créées, une ligne ou plusieurs', () => {
    expect(scopeArgs('create', { data: { title: 'x' } }, STORE)).toEqual({ data: { title: 'x', storeId: STORE } });
    expect(scopeArgs('createMany', { data: [{ a: 1 }, { a: 2 }] }, STORE)).toEqual({
      data: [
        { a: 1, storeId: STORE },
        { a: 2, storeId: STORE },
      ],
    });
  });

  it('couvre le filtre et la création d’un upsert', () => {
    expect(scopeArgs('upsert', { where: { id: '1' }, create: { a: 1 }, update: { a: 2 } }, STORE)).toEqual({
      where: { id: '1', storeId: STORE },
      create: { a: 1, storeId: STORE },
      update: { a: 2 },
    });
  });

  it('refuse de lire ou d’écrire pour une autre boutique', () => {
    expect(() => scopeArgs('findMany', { where: { storeId: 'store-b' } }, STORE)).toThrow(TenantViolationError);
    expect(() => scopeArgs('create', { data: { storeId: 'store-b' } }, STORE)).toThrow(TenantViolationError);
    expect(() => scopeArgs('create', { data: { store: { connect: { id: STORE } } } }, STORE)).toThrow(
      TenantViolationError,
    );
  });

  it('refuse une opération inconnue plutôt que de laisser passer', () => {
    expect(() => scopeArgs('findRaw', {}, STORE)).toThrow(TenantViolationError);
  });
});
