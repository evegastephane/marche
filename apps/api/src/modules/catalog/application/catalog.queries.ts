import { Injectable } from '@nestjs/common';
import type {
  BrandDto,
  BrandListQuery,
  CollectionDto,
  CollectionListQuery,
  Paginated,
  ProductDto,
  ProductListItemDto,
  ProductListQuery,
  SkuCheckDto,
  SkuCheckInput,
} from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { ProductRepository } from '../domain/catalog.repositories.js';
import { CatalogReadModel } from './catalog.read-model.js';

/** UC-17 et lectures du back-office. */
@Injectable()
export class CatalogQueries {
  constructor(
    private readonly readModel: CatalogReadModel,
    private readonly products: ProductRepository,
  ) {}

  /** Règle 5 en direct : le formulaire signale un SKU ou une référence pris avant l'enregistrement. */
  async checkSkus(input: SkuCheckInput): Promise<SkuCheckDto> {
    const [takenSkus, referenceTaken] = await Promise.all([
      input.skus.length ? this.products.takenSkus(input.skus, input.excludeProductId) : Promise.resolve([]),
      input.reference ? this.products.referenceExists(input.reference, input.excludeProductId) : Promise.resolve(false),
    ]);
    return { takenSkus, referenceTaken };
  }

  listProducts(query: ProductListQuery): Promise<Paginated<ProductListItemDto>> {
    return this.readModel.listProducts(query);
  }

  async getProduct(id: string): Promise<ProductDto> {
    const product = await this.readModel.getProduct(id);
    if (!product) throw new NotFoundError('Produit', id);
    return product;
  }

  listBrands(query: BrandListQuery): Promise<Paginated<BrandDto>> {
    return this.readModel.listBrands(query);
  }

  listCollections(query: CollectionListQuery): Promise<Paginated<CollectionDto>> {
    return this.readModel.listCollections(query);
  }
}
