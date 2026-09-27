import { Injectable } from '@nestjs/common';
import type { StoreDto, UpdateStoreInput } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { StoreRepository } from '../domain/store.repository.js';
import { StoreCacheInvalidator } from './store-cache.port.js';
import { toStoreDto } from './store.dto.js';

@Injectable()
export class GetCurrentStoreQuery {
  constructor(
    private readonly stores: StoreRepository,
    private readonly actor: ActorContext,
  ) {}

  async execute(): Promise<StoreDto> {
    const store = await this.stores.findById(this.actor.storeId);
    if (!store) throw new NotFoundError('Boutique', this.actor.storeId);
    return toStoreDto(store);
  }
}

/** UC-03 : modifier les paramètres de la boutique. */
@Injectable()
export class UpdateCurrentStoreUseCase {
  constructor(
    private readonly stores: StoreRepository,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly cache: StoreCacheInvalidator,
  ) {}

  async execute(input: UpdateStoreInput): Promise<StoreDto> {
    const storeId = this.actor.storeId;
    const store = await this.uow.run(async () => {
      const current = await this.stores.findById(storeId);
      if (!current) throw new NotFoundError('Boutique', storeId);
      current.update(input, this.clock.now());
      await this.stores.update(current);
      await this.outbox.addAll(current.pullEvents());
      return current;
    });
    await this.cache.invalidate(store.id, store.clerkOrgId);
    return toStoreDto(store);
  }
}
