import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type BrandDto,
  type BrandListQuery,
  brandListQuerySchema,
  type BulkProductActionInput,
  type BulkProductActionResultDto,
  bulkProductActionSchema,
  type CollectionDetailDto,
  type CollectionDto,
  type CollectionListQuery,
  collectionListQuerySchema,
  type CreateBrandInput,
  type CreateCollectionInput,
  type CreateProductInput,
  createBrandSchema,
  createCollectionSchema,
  createProductSchema,
  type Paginated,
  type ProductDto,
  type ProductListItemDto,
  type ProductListQuery,
  productListQuerySchema,
  type SetCollectionProductsInput,
  setCollectionProductsSchema,
  type UpdateBrandInput,
  type UpdateCollectionInput,
  type UpdateProductInput,
  updateBrandSchema,
  updateCollectionSchema,
  updateProductSchema,
} from '@marche/contracts';
import { ADMIN_API } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { BrandUseCases, CollectionUseCases } from '../application/brand-collection.use-cases.js';
import { CatalogQueries } from '../application/catalog.queries.js';
import {
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  DuplicateProductUseCase,
  UpdateProductUseCase,
} from '../application/product.use-cases.js';

@ApiTags('produits')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/products`)
export class ProductsController {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly changeStatus: ChangeProductStatusUseCase,
    private readonly duplicateProduct: DuplicateProductUseCase,
  ) {}

  /** UC-17 : recherche et filtres (q, status, brandId, collectionId). */
  @Get()
  list(@ZodQuery(productListQuerySchema) query: ProductListQuery): Promise<Paginated<ProductListItemDto>> {
    return this.queries.listProducts(query);
  }

  /** UC-11 : création avec variantes et stock initial. */
  @Post()
  @ApiZodBody(createProductSchema)
  create(@ZodBody(createProductSchema) input: CreateProductInput): Promise<ProductDto> {
    return this.createProduct.execute(input);
  }

  @Post('bulk')
  @HttpCode(200)
  @ApiZodBody(bulkProductActionSchema)
  bulk(@ZodBody(bulkProductActionSchema) input: BulkProductActionInput): Promise<BulkProductActionResultDto> {
    return this.changeStatus.bulk(input);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.queries.getProduct(id);
  }

  /** UC-12 : mise à jour complète ; `version` protège des écrasements concurrents. */
  @Put(':id')
  @ApiZodBody(updateProductSchema)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateProductSchema) input: UpdateProductInput,
  ): Promise<ProductDto> {
    return this.updateProduct.execute(id, input);
  }

  /** UC-14 */
  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.changeStatus.execute(id, 'publish');
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.changeStatus.execute(id, 'unpublish');
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.changeStatus.execute(id, 'archive');
  }

  /** UC-15 */
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.duplicateProduct.execute(id);
  }
}

@ApiTags('marques')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/brands`)
export class BrandsController {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly brands: BrandUseCases,
  ) {}

  @Get()
  list(@ZodQuery(brandListQuerySchema) query: BrandListQuery): Promise<Paginated<BrandDto>> {
    return this.queries.listBrands(query);
  }

  /** UC-10 */
  @Post()
  @ApiZodBody(createBrandSchema)
  create(@ZodBody(createBrandSchema) input: CreateBrandInput): Promise<BrandDto> {
    return this.brands.create(input);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BrandDto> {
    return this.brands.get(id);
  }

  @Patch(':id')
  @ApiZodBody(updateBrandSchema)
  update(@Param('id', ParseUUIDPipe) id: string, @ZodBody(updateBrandSchema) input: UpdateBrandInput): Promise<BrandDto> {
    return this.brands.update(id, input);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<BrandDto> {
    return this.brands.archive(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<BrandDto> {
    return this.brands.restore(id);
  }
}

@ApiTags('catalogues')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/collections`)
export class CollectionsController {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly collections: CollectionUseCases,
  ) {}

  @Get()
  list(@ZodQuery(collectionListQuerySchema) query: CollectionListQuery): Promise<Paginated<CollectionDto>> {
    return this.queries.listCollections(query);
  }

  /** UC-16 */
  @Post()
  @ApiZodBody(createCollectionSchema)
  create(@ZodBody(createCollectionSchema) input: CreateCollectionInput): Promise<CollectionDetailDto> {
    return this.collections.create(input);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CollectionDetailDto> {
    return this.collections.get(id);
  }

  @Patch(':id')
  @ApiZodBody(updateCollectionSchema)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateCollectionSchema) input: UpdateCollectionInput,
  ): Promise<CollectionDetailDto> {
    return this.collections.update(id, input);
  }

  /** Remplace la liste ordonnée des produits du catalogue. */
  @Put(':id/products')
  @ApiZodBody(setCollectionProductsSchema)
  setProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(setCollectionProductsSchema) input: SetCollectionProductsInput,
  ): Promise<CollectionDetailDto> {
    return this.collections.setProducts(id, input.productIds);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.collections.delete(id);
  }
}
