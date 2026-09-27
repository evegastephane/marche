import { Injectable } from '@nestjs/common';
import type {
  BulkProductActionInput,
  BulkProductActionResultDto,
  CreateProductInput,
  ProductDto,
  UpdateProductInput,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import {
  ConcurrentModificationError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/domain-error.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { MediaFacade } from '../../media/media.facade.js';
import { SkuTakenError, SlugTakenError } from '../domain/catalog.errors.js';
import { BrandRepository, ProductRepository } from '../domain/catalog.repositories.js';
import type { NewVariant, Product, ProductDraft } from '../domain/product.aggregate.js';
import { Product as ProductAggregate } from '../domain/product.aggregate.js';
import { CatalogReadModel } from './catalog.read-model.js';
import { allocateSlug, copiedSku } from './slug-allocator.js';

type ProductFields = CreateProductInput | UpdateProductInput;

/** Vérifications partagées par la création et la mise à jour d'un produit. */
@Injectable()
export class ProductWriteSupport {
  constructor(
    private readonly products: ProductRepository,
    private readonly brands: BrandRepository,
    private readonly media: MediaFacade,
    private readonly inventory: InventoryFacade,
    private readonly readModel: CatalogReadModel,
  ) {}

  async assertReferences(input: ProductFields): Promise<void> {
    if (input.brandId && !(await this.brands.isActive(input.brandId))) {
      throw new ValidationError('VALIDATION_FAILED', 'Marque introuvable ou archivée', { field: 'brandId' });
    }
    await this.media.assertUsable(input.mediaIds);
  }

  /** R1 : slug fourni et libre, sinon dérivé du titre et numéroté si besoin. */
  async resolveSlug(input: ProductFields, excludeId?: string): Promise<string> {
    if (input.slug) {
      if (await this.products.slugExists(input.slug, excludeId)) throw new SlugTakenError(input.slug);
      return input.slug;
    }
    return allocateSlug(input.title, (slug) => this.products.slugExists(slug, excludeId));
  }

  /** R1 : aucun SKU déjà utilisé par un autre produit de la boutique. */
  async assertSkusFree(skus: readonly string[], excludeProductId?: string): Promise<void> {
    const taken = await this.products.takenSkus(skus, excludeProductId);
    if (taken.length > 0) throw new SkuTakenError(taken);
  }

  toDraft(input: ProductFields, slug: string): ProductDraft {
    return {
      title: input.title,
      slug,
      description: input.description,
      brandId: input.brandId,
      options: input.options,
      variants: input.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        optionValues: variant.optionValues,
        priceAmount: variant.priceAmount,
        compareAtAmount: variant.compareAtAmount,
        trackInventory: variant.trackInventory,
        initialQuantity: variant.initialQuantity,
      })),
      mediaIds: input.mediaIds,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    };
  }

  initializeStock(newVariants: readonly NewVariant[]): Promise<void> {
    return this.inventory.initialize(
      newVariants.map((variant) => ({ variantId: variant.variantId, quantity: variant.initialQuantity })),
    );
  }

  async dto(productId: string): Promise<ProductDto> {
    const dto = await this.readModel.getProduct(productId);
    if (!dto) throw new NotFoundError('Produit', productId);
    return dto;
  }
}

/** UC-11 : créer un produit avec ses variantes et son stock initial (une seule transaction). */
@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly support: ProductWriteSupport,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductDto> {
    await this.support.assertReferences(input);
    const productId = await this.uow.run(async () => {
      const slug = await this.support.resolveSlug(input);
      await this.support.assertSkusFree(input.variants.map((variant) => variant.sku));
      const { product, newVariants } = ProductAggregate.create(
        this.actor.storeId,
        this.support.toDraft(input, slug),
        this.clock.now(),
      );
      await this.products.insert(product);
      await this.support.initializeStock(newVariants);
      await this.outbox.addAll(product.pullEvents());
      return product.id;
    });
    return this.support.dto(productId);
  }
}

/** UC-12 : mise à jour complète (variantes comprises) avec verrou optimiste. */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly support: ProductWriteSupport,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
  ) {}

  async execute(productId: string, input: UpdateProductInput): Promise<ProductDto> {
    await this.support.assertReferences(input);
    await this.uow.run(async () => {
      const product = await this.products.findById(productId);
      if (!product) throw new NotFoundError('Produit', productId);
      if (product.version !== input.version) throw new ConcurrentModificationError('Le produit');
      const slug = input.slug ?? product.slug;
      if (slug !== product.slug && (await this.products.slugExists(slug, productId))) {
        throw new SlugTakenError(slug);
      }
      await this.support.assertSkusFree(
        input.variants.map((variant) => variant.sku),
        productId,
      );
      const newVariants = product.update(this.support.toDraft(input, slug), this.clock.now());
      await this.products.update(product);
      await this.support.initializeStock(newVariants);
      await this.outbox.addAll(product.pullEvents());
    });
    return this.support.dto(productId);
  }
}

export type ProductStatusAction = BulkProductActionInput['action'];

/** UC-14 : publier (R3), dépublier, archiver — un produit ou plusieurs. */
@Injectable()
export class ChangeProductStatusUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly support: ProductWriteSupport,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
  ) {}

  async execute(productId: string, action: ProductStatusAction): Promise<ProductDto> {
    await this.apply(productId, action);
    return this.support.dto(productId);
  }

  /** Chaque produit est traité dans sa propre transaction : un échec n'annule pas les autres. */
  async bulk(input: BulkProductActionInput): Promise<BulkProductActionResultDto> {
    const result: BulkProductActionResultDto = { succeeded: [], failed: [] };
    for (const productId of new Set(input.productIds)) {
      try {
        await this.apply(productId, input.action);
        result.succeeded.push(productId);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        result.failed.push({ productId, code: error.code, message: error.message });
      }
    }
    return result;
  }

  private async apply(productId: string, action: ProductStatusAction): Promise<void> {
    await this.uow.run(async () => {
      const product = await this.products.findById(productId);
      if (!product) throw new NotFoundError('Produit', productId);
      const now = this.clock.now();
      if (action === 'publish') product.publish(now);
      else if (action === 'unpublish') product.unpublish(now);
      else product.archive(now);
      await this.products.update(product);
      await this.outbox.addAll(product.pullEvents());
    });
  }
}

/** UC-15 : dupliquer un produit (brouillon, nouveau slug, SKU suffixés « -COPIE »). */
@Injectable()
export class DuplicateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly support: ProductWriteSupport,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
  ) {}

  async execute(productId: string): Promise<ProductDto> {
    const copyId = await this.uow.run(async () => {
      const original = await this.products.findById(productId);
      if (!original) throw new NotFoundError('Produit', productId);
      const slug = await allocateSlug(`${original.slug}-copie`, (candidate) => this.products.slugExists(candidate));
      const attempt = await this.freeSkuAttempt(original);
      const { product, newVariants } = original.duplicate({
        slug,
        skuFor: (sku) => copiedSku(sku, attempt),
        now: this.clock.now(),
      });
      await this.products.insert(product);
      await this.support.initializeStock(newVariants);
      await this.outbox.addAll(product.pullEvents());
      return product.id;
    });
    return this.support.dto(copyId);
  }

  private async freeSkuAttempt(original: Product): Promise<number> {
    const skus = original.activeVariants.map((variant) => variant.sku);
    for (let attempt = 1; attempt <= 20; attempt++) {
      const taken = await this.products.takenSkus(skus.map((sku) => copiedSku(sku, attempt)));
      if (taken.length === 0) return attempt;
    }
    throw new SkuTakenError(skus.map((sku) => copiedSku(sku, 20)));
  }
}
