import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { CATALOG_TEMPLATES } from '../domain/catalog-templates/catalog-template.js';
import { CatalogTemplateInstaller } from '../domain/catalog.repositories.js';

export interface TemplateInstallResult {
  categories: number;
  attributes: number;
  values: number;
  links: number;
}

/**
 * Catalogue de départ d'une boutique. Il est posé à la première utilisation du catalogue
 * (une boutique neuve n'a aucune catégorie), ou réinstallé à la demande, sans rien écraser.
 */
@Injectable()
export class CatalogTemplateUseCases {
  constructor(
    private readonly installer: CatalogTemplateInstaller,
    private readonly stores: StoresFacade,
    private readonly actor: ActorContext,
    private readonly uow: UnitOfWork,
  ) {}

  /** Pose le catalogue de départ si la boutique n'a encore jamais eu de catégorie. */
  async ensureInstalled(): Promise<void> {
    if (await this.installer.hasCategories()) return;
    await this.install();
  }

  /** Ajoute ce qui manque du catalogue de départ (catégories, attributs, valeurs, liens). */
  async install(): Promise<TemplateInstallResult> {
    const { type } = await this.stores.getSettings(this.actor.storeId);
    return this.uow.run(() => this.installer.install(CATALOG_TEMPLATES[type]));
  }
}
