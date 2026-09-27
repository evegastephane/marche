import { Injectable } from '@nestjs/common';
import type {
  BrandDto,
  CollectionDetailDto,
  CreateBrandInput,
  CreateCollectionInput,
  UpdateBrandInput,
  UpdateCollectionInput,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { MediaFacade } from '../../media/media.facade.js';
import { Brand } from '../domain/brand.aggregate.js';
import { SlugTakenError } from '../domain/catalog.errors.js';
import {
  BrandRepository,
  CollectionRepository,
  ProductRepository,
} from '../domain/catalog.repositories.js';
import { Collection } from '../domain/collection.aggregate.js';
import { CatalogReadModel } from './catalog.read-model.js';
import { allocateSlug } from './slug-allocator.js';

/** UC-10 : marques (créer, modifier, archiver, restaurer). */
@Injectable()
export class BrandUseCases {
  constructor(
    private readonly brands: BrandRepository,
    private readonly media: MediaFacade,
    private readonly readModel: CatalogReadModel,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async create(input: CreateBrandInput): Promise<BrandDto> {
    if (input.logoMediaId) await this.media.assertUsable([input.logoMediaId]);
    const brandId = await this.uow.run(async () => {
      const slug = await this.resolveSlug(input.slug, input.name);
      const brand = Brand.create(this.actor.storeId, { ...input, slug }, this.clock.now());
      await this.brands.insert(brand);
      await this.outbox.addAll(brand.pullEvents());
      return brand.id;
    });
    return this.dto(brandId);
  }

  async update(brandId: string, input: UpdateBrandInput): Promise<BrandDto> {
    if (input.logoMediaId) await this.media.assertUsable([input.logoMediaId]);
    await this.mutate(brandId, async (brand) => {
      if (input.slug && input.slug !== brand.slug && (await this.brands.slugExists(input.slug, brandId))) {
        throw new SlugTakenError(input.slug);
      }
      brand.update(input, this.clock.now());
    });
    return this.dto(brandId);
  }

  async archive(brandId: string): Promise<BrandDto> {
    await this.mutate(brandId, (brand) => brand.archive(this.clock.now()));
    return this.dto(brandId);
  }

  async restore(brandId: string): Promise<BrandDto> {
    await this.mutate(brandId, (brand) => brand.restore(this.clock.now()));
    return this.dto(brandId);
  }

  async get(brandId: string): Promise<BrandDto> {
    return this.dto(brandId);
  }

  private async mutate(brandId: string, change: (brand: Brand) => void | Promise<void>): Promise<void> {
    await this.uow.run(async () => {
      const brand = await this.brands.findById(brandId);
      if (!brand) throw new NotFoundError('Marque', brandId);
      await change(brand);
      await this.brands.update(brand);
      await this.outbox.addAll(brand.pullEvents());
    });
  }

  private async resolveSlug(slug: string | undefined, name: string): Promise<string> {
    if (slug) {
      if (await this.brands.slugExists(slug)) throw new SlugTakenError(slug);
      return slug;
    }
    return allocateSlug(name, (candidate) => this.brands.slugExists(candidate));
  }

  private async dto(brandId: string): Promise<BrandDto> {
    const dto = await this.readModel.getBrand(brandId);
    if (!dto) throw new NotFoundError('Marque', brandId);
    return dto;
  }
}

/** UC-16 : catalogues (collections manuelles ordonnées). */
@Injectable()
export class CollectionUseCases {
  constructor(
    private readonly collections: CollectionRepository,
    private readonly products: ProductRepository,
    private readonly media: MediaFacade,
    private readonly readModel: CatalogReadModel,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async create(input: CreateCollectionInput): Promise<CollectionDetailDto> {
    if (input.imageMediaId) await this.media.assertUsable([input.imageMediaId]);
    const collectionId = await this.uow.run(async () => {
      let slug: string;
      if (input.slug) {
        if (await this.collections.slugExists(input.slug)) throw new SlugTakenError(input.slug);
        slug = input.slug;
      } else {
        slug = await allocateSlug(input.title, (candidate) => this.collections.slugExists(candidate));
      }
      const collection = Collection.create(this.actor.storeId, { ...input, slug }, this.clock.now());
      await this.collections.insert(collection);
      await this.outbox.addAll(collection.pullEvents());
      return collection.id;
    });
    return this.dto(collectionId);
  }

  async update(collectionId: string, input: UpdateCollectionInput): Promise<CollectionDetailDto> {
    if (input.imageMediaId) await this.media.assertUsable([input.imageMediaId]);
    await this.mutate(collectionId, async (collection) => {
      if (
        input.slug &&
        input.slug !== collection.slug &&
        (await this.collections.slugExists(input.slug, collectionId))
      ) {
        throw new SlugTakenError(input.slug);
      }
      collection.update(input, this.clock.now());
    });
    return this.dto(collectionId);
  }

  async setProducts(collectionId: string, productIds: readonly string[]): Promise<CollectionDetailDto> {
    const existing = new Set(await this.products.existingIds(productIds));
    const unknown = productIds.filter((id) => !existing.has(id));
    if (unknown.length > 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Produits introuvables', { productIds: unknown });
    }
    await this.mutate(collectionId, (collection) => collection.setProducts(productIds, this.clock.now()));
    return this.dto(collectionId);
  }

  async delete(collectionId: string): Promise<void> {
    await this.uow.run(async () => {
      const collection = await this.collections.findById(collectionId);
      if (!collection) throw new NotFoundError('Catalogue', collectionId);
      collection.markDeleted(this.clock.now());
      await this.collections.delete(collection);
      await this.outbox.addAll(collection.pullEvents());
    });
  }

  async get(collectionId: string): Promise<CollectionDetailDto> {
    return this.dto(collectionId);
  }

  private async mutate(
    collectionId: string,
    change: (collection: Collection) => void | Promise<void>,
  ): Promise<void> {
    await this.uow.run(async () => {
      const collection = await this.collections.findById(collectionId);
      if (!collection) throw new NotFoundError('Catalogue', collectionId);
      await change(collection);
      await this.collections.update(collection);
      await this.outbox.addAll(collection.pullEvents());
    });
  }

  private async dto(collectionId: string): Promise<CollectionDetailDto> {
    const dto = await this.readModel.getCollection(collectionId);
    if (!dto) throw new NotFoundError('Catalogue', collectionId);
    return dto;
  }
}
