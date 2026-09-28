import { Injectable } from '@nestjs/common';
import type { BundleDto, CreateBundleInput, UpdateBundleInput } from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { Bundle } from '../domain/bundle.aggregate.js';
import { BundleRepository, ProductRepository } from '../domain/catalog.repositories.js';
import { CatalogReadModel } from './catalog.read-model.js';

/** Packs : un appareil et ses accessoires, remisés quand ils sont achetés ensemble. */
@Injectable()
export class BundleUseCases {
  constructor(
    private readonly bundles: BundleRepository,
    private readonly products: ProductRepository,
    private readonly readModel: CatalogReadModel,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  list(filter: { anchorProductId?: string }): Promise<BundleDto[]> {
    return this.readModel.listBundles(filter);
  }

  get(bundleId: string): Promise<BundleDto> {
    return this.dto(bundleId);
  }

  async create(input: CreateBundleInput): Promise<BundleDto> {
    const bundleId = await this.uow.run(async () => {
      await this.assertProducts(input);
      const bundle = Bundle.create(this.actor.storeId, input, this.clock.now());
      await this.bundles.insert(bundle);
      await this.outbox.addAll(bundle.pullEvents());
      return bundle.id;
    });
    return this.dto(bundleId);
  }

  async update(bundleId: string, input: UpdateBundleInput): Promise<BundleDto> {
    await this.uow.run(async () => {
      const bundle = await this.load(bundleId);
      await this.assertProducts(input);
      bundle.update(input, this.clock.now());
      await this.bundles.update(bundle);
      await this.outbox.addAll(bundle.pullEvents());
    });
    return this.dto(bundleId);
  }

  async delete(bundleId: string): Promise<void> {
    await this.uow.run(async () => {
      const bundle = await this.load(bundleId);
      bundle.delete(this.clock.now());
      await this.bundles.delete(bundle);
      await this.outbox.addAll(bundle.pullEvents());
    });
  }

  /** L'appareil et les accessoires sont des produits de la boutique. */
  private async assertProducts(input: CreateBundleInput): Promise<void> {
    const ids = [input.anchorProductId, ...input.itemProductIds];
    const existing = new Set(await this.products.existingIds(ids));
    const missing = ids.filter((id) => !existing.has(id));
    if (missing.length > 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Produits introuvables', { productIds: missing });
    }
  }

  private async load(bundleId: string): Promise<Bundle> {
    const bundle = await this.bundles.findById(bundleId);
    if (!bundle) throw new NotFoundError('Pack', bundleId);
    return bundle;
  }

  private async dto(bundleId: string): Promise<BundleDto> {
    const dto = await this.readModel.getBundle(bundleId);
    if (!dto) throw new NotFoundError('Pack', bundleId);
    return dto;
  }
}
