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
