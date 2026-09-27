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
} from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { CatalogReadModel } from './catalog.read-model.js';

/** UC-17 et lectures du back-office. */
@Injectable()
export class CatalogQueries {
  constructor(private readonly readModel: CatalogReadModel) {}

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
