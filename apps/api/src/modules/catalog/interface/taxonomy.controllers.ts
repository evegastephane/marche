import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AttributeDto,
  type AttributeListQuery,
  attributeListQuerySchema,
  type AttributeValueInput,
  attributeValueInputSchema,
  type CategoryDetailDto,
  type CategoryDto,
  type CategoryListQuery,
  categoryListQuerySchema,
  type CreateAttributeInput,
  createAttributeSchema,
  type CreateCategoryInput,
  createCategorySchema,
  type ReorderAttributeValuesInput,
  reorderAttributeValuesSchema,
  type SetCategoryAttributesInput,
  setCategoryAttributesSchema,
  type TemplateInstallDto,
  type UpdateAttributeInput,
  updateAttributeSchema,
  type UpdateAttributeValueInput,
  updateAttributeValueSchema,
  type UpdateCategoryInput,
  updateCategorySchema,
} from '@marche/contracts';
import { ADMIN_API, ApiScope } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ApiZodQuery, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { TaxonomyQueries } from '../application/taxonomy.read-model.js';
import { AttributeUseCases, CategoryUseCases } from '../application/taxonomy.use-cases.js';

@ApiTags('catégories')
@ApiBearerAuth()
@ApiScope('catalog')
@Controller(`${ADMIN_API}/categories`)
export class CategoriesController {
  constructor(
    private readonly queries: TaxonomyQueries,
    private readonly categories: CategoryUseCases,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Arbre des catégories', description: 'Liste à plat (parentId), triée par position, avec le nombre de produits de chaque catégorie. Le catalogue de départ est posé au premier appel.' })
  @ApiZodQuery(categoryListQuerySchema)
  list(@ZodQuery(categoryListQuerySchema) query: CategoryListQuery): Promise<CategoryDto[]> {
    return this.queries.listCategories(query);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie', description: 'Sous un parent actif, 4 niveaux au plus. Le slug est dérivé du nom s’il est absent.' })
  @ApiZodBody(createCategorySchema)
  async create(@ZodBody(createCategorySchema) input: CreateCategoryInput): Promise<CategoryDetailDto> {
    return this.queries.getCategory(await this.categories.create(input));
  }

  @Post('template')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinstaller le catalogue de départ', description: 'Ajoute les catégories, attributs et valeurs manquants du modèle de la boutique. Rien n’est écrasé.' })
  installTemplate(): Promise<TemplateInstallDto> {
    return this.categories.installTemplate();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une catégorie', description: 'Chemin depuis la racine et attributs effectifs : hérités des parents (marqués) puis propres.' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDetailDto> {
    return this.queries.getCategory(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer, déplacer, régler le suivi à l’unité', description: 'Changer le suivi à l’unité n’est possible que si les articles concernés n’ont pas de stock.' })
  @ApiZodBody(updateCategorySchema)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateCategorySchema) input: UpdateCategoryInput,
  ): Promise<CategoryDetailDto> {
    await this.categories.update(id, input);
    return this.queries.getCategory(id);
  }

  @Put(':id/attributes')
  @ApiOperation({ summary: 'Attributs propres à la catégorie', description: 'Remplace la liste ordonnée ; ceux des parents s’ajoutent automatiquement.' })
  @ApiZodBody(setCategoryAttributesSchema)
  async setAttributes(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(setCategoryAttributesSchema) input: SetCategoryAttributesInput,
  ): Promise<CategoryDetailDto> {
    await this.categories.setAttributes(id, input);
    return this.queries.getCategory(id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archiver une catégorie', description: 'Refusé (409 CATEGORY_IN_USE) tant qu’elle contient des produits ou des sous-catégories.' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDetailDto> {
    await this.categories.archive(id);
    return this.queries.getCategory(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restaurer une catégorie archivée' })
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDetailDto> {
    await this.categories.restore(id);
    return this.queries.getCategory(id);
  }
}

@ApiTags('attributs')
@ApiBearerAuth()
@ApiScope('catalog')
@Controller(`${ADMIN_API}/attributes`)
export class AttributesController {
  constructor(
    private readonly queries: TaxonomyQueries,
    private readonly attributes: AttributeUseCases,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Attributs de la boutique', description: 'Avec leurs valeurs et les catégories qui les proposent directement.' })
  @ApiZodQuery(attributeListQuerySchema)
  list(@ZodQuery(attributeListQuerySchema) query: AttributeListQuery): Promise<AttributeDto[]> {
    return this.queries.listAttributes(query);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un attribut', description: 'Un nombre a toujours une unité ; un axe de variante est une liste à un choix. `categoryId` le rattache tout de suite à une catégorie.' })
  @ApiZodBody(createAttributeSchema)
  async create(@ZodBody(createAttributeSchema) input: CreateAttributeInput): Promise<AttributeDto> {
    return this.queries.getAttribute(await this.attributes.create(input));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un attribut' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AttributeDto> {
    return this.queries.getAttribute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un attribut', description: 'Le type et le rôle d’axe sont figés dès qu’un produit utilise l’attribut (409 ATTRIBUTE_IN_USE).' })
  @ApiZodBody(updateAttributeSchema)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateAttributeSchema) input: UpdateAttributeInput,
  ): Promise<AttributeDto> {
    await this.attributes.update(id, input);
    return this.queries.getAttribute(id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archiver un attribut', description: 'Il n’est plus proposé ; les fiches existantes gardent leurs valeurs.' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<AttributeDto> {
    await this.attributes.archive(id);
    return this.queries.getAttribute(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restaurer un attribut archivé' })
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<AttributeDto> {
    await this.attributes.restore(id);
    return this.queries.getAttribute(id);
  }

  @Post(':id/values')
  @ApiOperation({ summary: 'Ajouter une valeur', description: 'Le code SKU (Noir → NOI) est calculé s’il est absent.' })
  @ApiZodBody(attributeValueInputSchema)
  async addValue(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(attributeValueInputSchema) input: AttributeValueInput,
  ): Promise<AttributeDto> {
    await this.attributes.addValue(id, input);
    return this.queries.getAttribute(id);
  }

  @Put(':id/values/order')
  @ApiOperation({ summary: 'Réordonner les valeurs', description: 'Chaque valeur est citée une fois.' })
  @ApiZodBody(reorderAttributeValuesSchema)
  async reorderValues(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(reorderAttributeValuesSchema) input: ReorderAttributeValuesInput,
  ): Promise<AttributeDto> {
    await this.attributes.reorderValues(id, input);
    return this.queries.getAttribute(id);
  }

  @Patch(':id/values/:valueId')
  @ApiOperation({ summary: 'Modifier une valeur', description: 'Un renommage est répercuté sur les fiches, variantes et photos qui la portent.' })
  @ApiZodBody(updateAttributeValueSchema)
  async updateValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
    @ZodBody(updateAttributeValueSchema) input: UpdateAttributeValueInput,
  ): Promise<AttributeDto> {
    await this.attributes.updateValue(id, valueId, input);
    return this.queries.getAttribute(id);
  }

  @Delete(':id/values/:valueId')
  @ApiOperation({ summary: 'Supprimer une valeur', description: 'Refusé (409 ATTRIBUTE_VALUE_IN_USE) si un produit l’utilise.' })
  async removeValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
  ): Promise<AttributeDto> {
    await this.attributes.removeValue(id, valueId);
    return this.queries.getAttribute(id);
  }
}
