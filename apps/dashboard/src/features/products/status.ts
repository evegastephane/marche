import type { ProductStatus } from '@marche/contracts';
import type { BadgeTone } from '@/shared/ui/badge';

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: BadgeTone; hint: string }> = {
  ACTIVE: {
    label: 'En vente',
    tone: 'success',
    hint: 'Visible sur votre site',
  },
  DRAFT: {
    label: 'Brouillon',
    tone: 'draft',
    hint: 'Invisible sur votre site',
  },
  ARCHIVED: { label: 'Archivé', tone: 'outline', hint: 'Retiré de la vente' },
};

export type ProductFilter = 'all' | ProductStatus;

export const PRODUCT_FILTERS: { value: ProductFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'ACTIVE', label: 'En vente' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ARCHIVED', label: 'Archivés' },
];
