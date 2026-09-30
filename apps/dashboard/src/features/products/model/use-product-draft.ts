import type { CategoryAttributeDto, Currency, DeviceModelDto, ProductDto, VariantOptions } from '@marche/contracts';
import { combinationKey } from '@marche/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import { categoryQuery, useCategory } from '../../categories/api';
import {
  applyDevice,
  draftFromProduct,
  emptyDraft,
  type ProductDraft,
  regenerateVariants,
  type SpecDraft,
  type VariantDraft,
  withDefaultWarranty,
  withSuggestedSkus,
  withTitle,
} from './product-draft';

const NO_ATTRIBUTES: CategoryAttributeDto[] = [];

/**
 * État du formulaire produit et ses gestes. Les règles (combinaisons, SKU, fiche) viennent de
 * `product-draft.ts` ; les attributs, de la catégorie choisie (lue sur l'API).
 */
export function useProductDraft({
  product,
  currency,
  defaultWarranty,
}: {
  product?: ProductDto;
  currency: Currency;
  defaultWarranty: number | null;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? draftFromProduct(product, currency) : withDefaultWarranty(emptyDraft(), defaultWarranty),
  );
  const category = useCategory(draft.categoryId || null);
  const api = useApi();
  const store = useStoreKey();
  const queryClient = useQueryClient();
  const current = category.data?.id === draft.categoryId ? category.data : undefined;
  const attributes = current?.attributes ?? NO_ATTRIBUTES;

  /** Relit la catégorie (après l'ajout d'une valeur, par exemple) et renvoie ses attributs. */
  const loadAttributes = async (categoryId: string, fresh = false) => {
    const query = categoryQuery(api, store, categoryId);
    const detail = fresh ? await queryClient.fetchQuery({ ...query, staleTime: 0 }) : await queryClient.fetchQuery(query);
    return detail.attributes;
  };

  const withAxes = (prev: ProductDraft, axes: Record<string, string[]>, list = attributes) =>
    regenerateVariants({ ...prev, axes }, list);

  return {
    draft,
    setDraft,
    category: current,
    categoryLoading: Boolean(draft.categoryId) && !current,
    attributes,
    tracksUnits: current?.tracksUnitsEffective ?? false,

    update: (patch: Partial<Pick<ProductDraft, 'description' | 'brandId' | 'warranty' | 'publish' | 'media' | 'mediaOptionValues' | 'accessories'>>) =>
      setDraft((prev) => ({ ...prev, ...patch })),

    setTitle: (title: string) => setDraft((prev) => withTitle(prev, title, attributes)),

    setReference: (reference: string) =>
      setDraft((prev) =>
        withSuggestedSkus({ ...prev, reference: reference.toUpperCase(), referenceTouched: reference.trim() !== '' }, attributes),
      ),

    /** Nouvelle catégorie : ses axes décident des variantes dès qu'elle est lue. */
    setCategory: async (categoryId: string) => {
      setDraft((prev) => ({ ...prev, categoryId }));
      if (!categoryId) return;
      const list = await loadAttributes(categoryId);
      setDraft((prev) => (prev.categoryId === categoryId ? regenerateVariants(prev, list) : prev));
    },

    setSpec: (slug: string, value: SpecDraft) => setDraft((prev) => ({ ...prev, specs: { ...prev.specs, [slug]: value } })),

    toggleAxisValue: (slug: string, value: string, on: boolean) =>
      setDraft((prev) => {
        const values = prev.axes[slug] ?? [];
        const next = on ? [...values.filter((v) => v !== value), value] : values.filter((v) => v !== value);
        return withAxes(prev, { ...prev.axes, [slug]: next });
      }),

    /** Valeur créée à la volée (« ajouter une valeur ») : relue sur l'API, puis cochée. */
    pickNewAxisValue: async (slug: string, value: string) => {
      const list = draft.categoryId ? await loadAttributes(draft.categoryId, true) : attributes;
      setDraft((prev) => withAxes(prev, { ...prev.axes, [slug]: [...(prev.axes[slug] ?? []), value] }, list));
    },

    setVariant: (key: string, patch: Partial<VariantDraft>) =>
      setDraft((prev) => ({ ...prev, variants: prev.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) })),

    /** Proposer ou retirer une combinaison (1 To en Argent, par exemple). */
    toggleCombination: (options: VariantOptions, offered: boolean) =>
      setDraft((prev) => {
        const key = combinationKey(options);
        const excluded = offered ? prev.excluded.filter((k) => k !== key) : [...new Set([...prev.excluded, key])];
        return regenerateVariants({ ...prev, excluded }, attributes);
      }),

    applyDevice: async (device: DeviceModelDto, brandId: string | null, addMissing: () => Promise<boolean>) => {
      const refreshed = (await addMissing()) && draft.categoryId ? await loadAttributes(draft.categoryId, true) : attributes;
      setDraft((prev) => applyDevice(prev, device, refreshed, { brandId, isNew: !product }));
    },
  };
}

export type ProductDraftState = ReturnType<typeof useProductDraft>;
