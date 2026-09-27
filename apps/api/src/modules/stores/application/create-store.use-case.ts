import { Injectable, Logger } from '@nestjs/common';
import type { CreateStoreInput, StoreDto } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ForbiddenError } from '../../../shared/domain/domain-error.js';
import { Store } from '../domain/store.aggregate.js';
import { StoreSlugTakenError } from '../domain/store.errors.js';
import { StoreMembershipRepository, StoreRepository } from '../domain/store.repository.js';
import { OrganizationDirectory, OrganizationSlugTakenError } from './organization-directory.port.js';
import { StoreCacheInvalidator } from './store-cache.port.js';
import { toStoreDto } from './store.dto.js';

/**
 * UC-02 : créer sa boutique. L'organisation Clerk est créée d'abord ;
 * si l'écriture en base échoue, elle est supprimée (compensation).
 */
@Injectable()
export class CreateStoreUseCase {
  private readonly logger = new Logger(CreateStoreUseCase.name);

  constructor(
    private readonly stores: StoreRepository,
    private readonly memberships: StoreMembershipRepository,
    private readonly directory: OrganizationDirectory,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly cache: StoreCacheInvalidator,
  ) {}

  async execute(input: CreateStoreInput): Promise<StoreDto> {
    const userId = this.actor.userId;
    const clerkUserId = this.actor.clerkUserId;
    if (!userId || !clerkUserId) {
      throw new ForbiddenError('FORBIDDEN', 'Utilisateur non identifié');
    }
    if (await this.stores.slugExists(input.slug)) {
      throw new StoreSlugTakenError(input.slug);
    }

    let clerkOrgId: string;
    try {
      ({ clerkOrgId } = await this.directory.createOrganization({
        name: input.name,
        slug: input.slug,
        createdByClerkUserId: clerkUserId,
      }));
    } catch (error) {
      if (error instanceof OrganizationSlugTakenError) throw new StoreSlugTakenError(input.slug);
      throw error;
    }

    try {
      const store = Store.create({ ...input, clerkOrgId }, this.clock.now());
      await this.uow.run(async () => {
        await this.stores.insert(store);
        await this.memberships.upsert(store.id, userId, 'OWNER');
        await this.outbox.addAll(store.pullEvents());
      });
      await this.cache.invalidate(store.id, clerkOrgId);
      return toStoreDto(store);
    } catch (error) {
      await this.directory.deleteOrganization(clerkOrgId).catch((cleanupError: unknown) =>
        this.logger.error(`Organisation ${clerkOrgId} orpheline : suppression impossible`, cleanupError),
      );
      throw error;
    }
  }
}
