import type { ProductStatus } from '@marche/contracts';
import type { PlaqueTone } from '@/shared/ui/plaque';

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: PlaqueTone; hint: string }> = {
  ACTIVE: { label: 'En vente', tone: 'vert', hint: 'Visible sur votre site' },
  DRAFT: { label: 'Brouillon', tone: 'pointille', hint: 'Invisible sur votre site' },
  ARCHIVED: { label: 'Archivé', tone: 'contour', hint: 'Retiré de la vente' },
};

export type ProductFilter = 'all' | ProductStatus;

export const PRODUCT_FILTERS: { value: ProductFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'ACTIVE', label: 'En vente' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ARCHIVED', label: 'Archivés' },
];
