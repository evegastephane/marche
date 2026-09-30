import { Injectable } from '@nestjs/common';
import type {
  AttributeDto,
  AttributeListQuery,
  CategoryDetailDto,
  CategoryDto,
  CategoryListQuery,
} from '@marche/contracts';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { CatalogTemplateUseCases } from './catalog-template.use-cases.js';

/** Lectures des catégories et attributs pour le back-office (sans passer par les agrégats). */
export abstract class TaxonomyReadModel {
  /** Toutes les catégories à plat (le client reconstruit l'arbre par parentId), ordonnées par position. */
  abstract listCategories(query: CategoryListQuery): Promise<CategoryDto[]>;
  abstract getCategory(id: string): Promise<CategoryDetailDto | null>;
  abstract listAttributes(query: AttributeListQuery): Promise<AttributeDto[]>;
  abstract getAttribute(id: string): Promise<AttributeDto | null>;
}

/** Le catalogue de départ est posé au premier accès, lecture comprise. */
@Injectable()
export class TaxonomyQueries {
  constructor(
    private readonly readModel: TaxonomyReadModel,
    private readonly templates: CatalogTemplateUseCases,
  ) {}

  async listCategories(query: CategoryListQuery): Promise<CategoryDto[]> {
    await this.templates.ensureInstalled();
    return this.readModel.listCategories(query);
  }

  async getCategory(id: string): Promise<CategoryDetailDto> {
    const category = await this.readModel.getCategory(id);
    if (!category) throw new NotFoundError('Catégorie', id);
    return category;
  }

  async listAttributes(query: AttributeListQuery): Promise<AttributeDto[]> {
    await this.templates.ensureInstalled();
    return this.readModel.listAttributes(query);
  }

  async getAttribute(id: string): Promise<AttributeDto> {
    const attribute = await this.readModel.getAttribute(id);
    if (!attribute) throw new NotFoundError('Attribut', id);
    return attribute;
  }
}
