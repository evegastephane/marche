import type { ProductStatus } from '@marche/contracts';
import type { BadgeTone } from '@/shared/ui/badge';

/** États des produits en témoins : plein = en vente, pointillé = brouillon, creux = archivé. */
export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: BadgeTone; hint: string }> = {
  ACTIVE: {
    label: 'En vente',
    tone: 'on',
    hint: 'Visible sur votre site',
  },
  DRAFT: {
    label: 'Brouillon',
    tone: 'draft',
    hint: 'Invisible sur votre site',
  },
  ARCHIVED: { label: 'Archivé', tone: 'off', hint: 'Retiré de la vente' },
};

export type ProductFilter = 'all' | ProductStatus;

export const PRODUCT_FILTERS: { value: ProductFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'ACTIVE', label: 'En vente' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ARCHIVED', label: 'Archivés' },
];
