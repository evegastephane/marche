import { Injectable } from '@nestjs/common';
import { ClsService, type ClsStore } from 'nestjs-cls';
import { ActorContext, type MemberRole } from '../../application/actor-context.port.js';

export interface MarcheClsStore extends ClsStore {
  storeId?: string;
  userId?: string;
  clerkUserId?: string;
  role?: MemberRole;
  /** Accès système : l'isolation par boutique est levée (relais outbox, résolution d'hôte). */
  system?: boolean;
}

export class MissingTenantError extends Error {
  constructor(detail?: string) {
    super(`Aucune boutique dans le contexte courant${detail ? ` (${detail})` : ''}`);
    this.name = 'MissingTenantError';
  }
}

/** Contexte de la requête ou du job, porté par AsyncLocalStorage (nestjs-cls). */
@Injectable()
export class TenantContext extends ActorContext {
  constructor(private readonly cls: ClsService<MarcheClsStore>) {
    super();
  }

  get storeId(): string {
    const storeId = this.optionalStoreId;
    if (!storeId) throw new MissingTenantError();
    return storeId;
  }

  get optionalStoreId(): string | undefined {
    return this.cls.isActive() ? this.cls.get('storeId') : undefined;
  }

  get userId(): string | null {
    return (this.cls.isActive() ? this.cls.get('userId') : undefined) ?? null;
  }

  get clerkUserId(): string | null {
    return (this.cls.isActive() ? this.cls.get('clerkUserId') : undefined) ?? null;
  }

  get role(): MemberRole | null {
    return (this.cls.isActive() ? this.cls.get('role') : undefined) ?? null;
  }

  get isSystem(): boolean {
    return this.cls.isActive() && this.cls.get('system') === true;
  }

  setUser(userId: string, clerkUserId: string): void {
    this.cls.set('userId', userId);
    this.cls.set('clerkUserId', clerkUserId);
  }

  setStore(storeId: string, role?: MemberRole): void {
    this.cls.set('storeId', storeId);
    if (role) this.cls.set('role', role);
  }

  /** Exécute `work` dans un nouveau contexte limité à une boutique (jobs, scripts). */
  runForStore<T>(storeId: string, work: () => Promise<T>): Promise<T> {
    return this.cls.run(() => {
      this.cls.set('storeId', storeId);
      return work();
    });
  }

  /** Exécute `work` sans isolation par boutique. À réserver aux traitements techniques. */
  runAsSystem<T>(work: () => Promise<T>): Promise<T> {
    return this.cls.run(() => {
      this.cls.set('system', true);
      return work();
    });
  }
}
