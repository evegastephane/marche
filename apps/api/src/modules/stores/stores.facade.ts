import { Injectable } from '@nestjs/common';
import type { Currency, ShippingSettings } from '@marche/contracts';
import type { MemberRole } from '../../shared/application/actor-context.port.js';
import { Clock } from '../../shared/application/clock.port.js';
import { OutboxPort } from '../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../shared/application/unit-of-work.port.js';
import { NotFoundError } from '../../shared/domain/domain-error.js';
import { StoreCache } from './infrastructure/store-cache.js';
import { StoreMembershipRepository, StoreRepository } from './domain/store.repository.js';

export interface StoreSettings {
  id: string;
  name: string;
  slug: string;
  currency: Currency;
  country: string;
  timezone: string;
  contactEmail: string | null;
  phone: string | null;
  logoMediaId: string | null;
  shippingSettings: ShippingSettings;
  lowStockDefault: number;
  archived: boolean;
}

/** API publique du module stores (Facade) : seul point d'entrée pour les autres modules. */
@Injectable()
export class StoresFacade {
  constructor(
    private readonly stores: StoreRepository,
    private readonly memberships: StoreMembershipRepository,
    private readonly storeCache: StoreCache,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
  ) {}

  /** Organisation Clerk → boutique (cache 5 min). */
  async resolveByClerkOrg(
    clerkOrgId: string,
  ): Promise<{ storeId: string; archived: boolean } | null> {
    const key = StoreCache.orgKey(clerkOrgId);
    const cached = await this.storeCache.cache.get<{ storeId: string; archived: boolean } | null>(key);
    if (cached !== undefined) return cached;
    const store = await this.stores.findByClerkOrgId(clerkOrgId);
    const resolved = store ? { storeId: store.id, archived: store.isArchived } : null;
    // Une organisation sans boutique est mise en cache brièvement (création possiblement en cours).
    await this.storeCache.cache.set(
      key,
      resolved,
      resolved ? StoreCache.ORG_TTL : StoreCache.UNKNOWN_ORG_TTL,
    );
    return resolved;
  }

  /** Réglages de la boutique (cache 60 s). */
  getSettings(storeId: string): Promise<StoreSettings> {
    return this.storeCache.cache.getOrSet(
      StoreCache.settingsKey(storeId),
      StoreCache.SETTINGS_TTL,
      async () => {
        const store = await this.stores.findById(storeId);
        if (!store) throw new NotFoundError('Boutique', storeId);
        const s = store.snapshot();
        return {
          id: store.id,
          name: s.name,
          slug: s.slug,
          currency: s.currency,
          country: s.country,
          timezone: s.timezone,
          contactEmail: s.contactEmail,
          phone: s.phone,
          logoMediaId: s.logoMediaId,
          shippingSettings: s.shippingSettings,
          lowStockDefault: s.lowStockDefault,
          archived: store.isArchived,
        } satisfies StoreSettings;
      },
    );
  }

  /**
   * Vérifie l'appartenance à la boutique. Le rôle revendiqué vient du jeton Clerk (signé) :
   * l'adhésion est enregistrée à la volée si le webhook n'est pas encore arrivé.
   */
  async ensureMembership(storeId: string, userId: string, claimedRole: MemberRole): Promise<MemberRole> {
    const key = StoreCache.memberKey(storeId, userId);
    const cached = await this.storeCache.cache.get<MemberRole>(key);
    if (cached) return cached;
    const current = await this.memberships.findRole(storeId, userId);
    const role =
      current === 'OWNER' || current === claimedRole
        ? current
        : await this.memberships.upsert(storeId, userId, claimedRole);
    await this.storeCache.cache.set(key, role, StoreCache.MEMBER_TTL);
    return role;
  }

  async setMembershipRole(storeId: string, userId: string, role: MemberRole): Promise<void> {
    await this.memberships.upsert(storeId, userId, role);
    await this.storeCache.invalidateMember(storeId, userId);
  }

  async removeMembership(storeId: string, userId: string): Promise<void> {
    await this.memberships.remove(storeId, userId);
    await this.storeCache.invalidateMember(storeId, userId);
  }

  /** Archive la boutique liée à une organisation supprimée dans Clerk. */
  async archiveByClerkOrg(clerkOrgId: string): Promise<void> {
    await this.uow.run(async () => {
      const store = await this.stores.findByClerkOrgId(clerkOrgId);
      if (!store || store.isArchived) return;
      store.archive(this.clock.now());
      await this.stores.update(store);
      await this.outbox.addAll(store.pullEvents());
      await this.storeCache.invalidate(store.id, clerkOrgId);
    });
  }

  /** Numéro de commande suivant (#1001, #1002…), dans la transaction courante. */
  nextOrderNumber(storeId: string): Promise<number> {
    return this.stores.nextOrderNumber(storeId);
  }

  /** Destinataires des notifications marchand : e-mail de contact, sinon les propriétaires. */
  async notificationRecipients(storeId: string): Promise<string[]> {
    const settings = await this.getSettings(storeId);
    if (settings.contactEmail) return [settings.contactEmail];
    return this.memberships.ownerEmails(storeId);
  }
}
