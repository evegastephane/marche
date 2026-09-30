import type { TaxonomyAttribute, TaxonomyCategory, TaxonomyLink } from '@marche/contracts';
import type { Attribute } from './attribute.aggregate.js';
import type { CatalogTemplate } from './catalog-templates/catalog-template.js';
import type { Category } from './category.aggregate.js';
import type { Brand } from './brand.aggregate.js';
import type { Bundle } from './bundle.aggregate.js';
import type { Collection } from './collection.aggregate.js';
import type { Product } from './product.aggregate.js';

export abstract class BrandRepository {
  abstract findById(id: string): Promise<Brand | null>;
  abstract slugExists(slug: string, excludeId?: string): Promise<boolean>;
  /** Marque existante et non archivée. */
  abstract isActive(id: string): Promise<boolean>;
  abstract insert(brand: Brand): Promise<void>;
  abstract update(brand: Brand): Promise<void>;
}

export abstract class ProductRepository {
  abstract findById(id: string): Promise<Product | null>;
  abstract slugExists(slug: string, excludeId?: string): Promise<boolean>;
  /** SKU déjà utilisés par d'autres produits de la boutique. */
  abstract takenSkus(skus: readonly string[], excludeProductId?: string): Promise<string[]>;
  /** Référence (« sku parent ») déjà portée par un autre produit de la boutique. */
  abstract referenceExists(reference: string, excludeId?: string): Promise<boolean>;
  abstract existingIds(ids: readonly string[]): Promise<string[]>;
  abstract insert(product: Product): Promise<void>;
  /** Lève ConcurrentModificationError si la version a changé entre-temps. */
  abstract update(product: Product): Promise<void>;
}

export abstract class CollectionRepository {
  abstract findById(id: string): Promise<Collection | null>;
  abstract slugExists(slug: string, excludeId?: string): Promise<boolean>;
  abstract insert(collection: Collection): Promise<void>;
  abstract update(collection: Collection): Promise<void>;
  abstract delete(collection: Collection): Promise<void>;
}

export abstract class BundleRepository {
  abstract findById(id: string): Promise<Bundle | null>;
  abstract insert(bundle: Bundle): Promise<void>;
  abstract update(bundle: Bundle): Promise<void>;
  abstract delete(bundle: Bundle): Promise<void>;
}

/** Catégories et attributs de la boutique, tels que le domaine les lit (archivés exclus). */
export interface TaxonomySnapshot {
  categories: TaxonomyCategory[];
  attributes: TaxonomyAttribute[];
  links: TaxonomyLink[];
}

export abstract class TaxonomyRepository {
  /** Arbre actif de la boutique : catégories et attributs non archivés, et leurs liens. */
  abstract snapshot(): Promise<TaxonomySnapshot>;

  abstract findCategory(id: string): Promise<Category | null>;
  abstract categorySlugExists(slug: string, excludeId?: string): Promise<boolean>;
  /** Produits non archivés rangés dans la catégorie, et sous-catégories actives. */
  abstract categoryUsage(id: string): Promise<{ products: number; children: number }>;
  abstract insertCategory(category: Category): Promise<void>;
  abstract updateCategory(category: Category): Promise<void>;
  /** Remplace les attributs propres à une catégorie (les hérités ne sont pas concernés). */
  abstract replaceCategoryAttributes(
    categoryId: string,
    links: readonly { attributeId: string; required: boolean; position: number }[],
  ): Promise<void>;
  /** Variantes (non archivées) des produits rangés dans ces catégories. */
  abstract variantIdsInCategories(categoryIds: readonly string[]): Promise<string[]>;

  abstract findAttribute(id: string): Promise<Attribute | null>;
  abstract attributeSlugExists(slug: string, excludeId?: string): Promise<boolean>;
  /** Un produit ou une variante (même archivée) porte-t-il cet attribut ? */
  abstract attributeInUse(slug: string): Promise<boolean>;
  /** Un produit ou une variante porte-t-il cette valeur ? */
  abstract valueInUse(slug: string, value: string): Promise<boolean>;
  abstract insertAttribute(attribute: Attribute): Promise<void>;
  /** Enregistre l'attribut et synchronise ses valeurs (ajout, modification, suppression). */
  abstract updateAttribute(attribute: Attribute): Promise<void>;
  /** Répercute le renommage d'une valeur sur les fiches, les variantes et les photos qui la portent. */
  abstract renameValue(attribute: Attribute, from: string, to: string): Promise<void>;
}

/** Pose le catalogue de départ (catégories, attributs) de la boutique courante. */
export abstract class CatalogTemplateInstaller {
  /** La boutique a déjà eu au moins une catégorie (archivées comprises). */
  abstract hasCategories(): Promise<boolean>;
  /** Ajoute ce qui manque du gabarit, dans la transaction courante ; renvoie les quantités ajoutées. */
  abstract install(template: CatalogTemplate): Promise<{ categories: number; attributes: number; values: number; links: number }>;
}
