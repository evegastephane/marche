'use client';

import type { StorefrontAccessoryDto, StorefrontProductDto } from '@marche/contracts';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { addManyToCart, addToCart } from '@/actions/cart';
import { track } from '@/components/analytics';
import {
  type Availability,
  galleryFor,
  initialSelection,
  isInStock,
  resolveVariant,
  valueState,
} from '@/lib/product';

export type ConfiguratorStatus = 'available' | 'soldout' | 'unoffered';

/**
 * État d'une fiche produit, partagé par les templates : sélection des options, déclinaison,
 * disponibilité, quantité, accessoires cochés, ajout au panier (seul ou groupé).
 */
export function useConfigurator(product: StorefrontProductDto, availability: Availability) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<string[]>(() => initialSelection(product, availability));
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  /** Accessoires cochés : produit → déclinaison choisie. */
  const [extras, setExtras] = useState<Record<string, string>>({});

  const variant = useMemo(() => resolveVariant(product.variants, selection), [product.variants, selection]);
  const available = variant ? availability[variant.id] : 0;
  const status: ConfiguratorStatus = !variant ? 'unoffered' : isInStock(variant, availability) ? 'available' : 'soldout';
  const max = available === null || available === undefined ? 99 : Math.max(1, Math.min(99, available));
  const images = useMemo(() => galleryFor(product, selection), [product, selection]);

  const select = (index: number, value: string) => {
    setSelection((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setQuantity(1);
    setMessage(null);
  };

  const stateOf = (index: number, value: string) => valueState(product, availability, selection, index, value);

  const toggleExtra = (accessory: StorefrontAccessoryDto, variantId: string | null) =>
    setExtras((prev) => {
      const next = { ...prev };
      if (next[accessory.id] && variantId === null) delete next[accessory.id];
      else if (variantId) next[accessory.id] = variantId;
      else delete next[accessory.id];
      return next;
    });

  const run = (lines: { variantId: string; quantity: number }[], label: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = lines.length === 1 ? await addToCart(lines[0]!.variantId, lines[0]!.quantity) : await addManyToCart(lines);
      if (result.ok) {
        setMessage({ ok: true, text: label });
        for (const line of lines) track('add_to_cart', { variantId: line.variantId, quantity: line.quantity });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  };

  /** Ajoute la déclinaison choisie et les accessoires cochés. */
  const add = () => {
    if (!variant || status !== 'available') return;
    const extraLines = Object.values(extras).map((variantId) => ({ variantId, quantity: 1 }));
    run(
      [{ variantId: variant.id, quantity }, ...extraLines],
      extraLines.length > 0 ? `Ajouté avec ${extraLines.length} accessoire${extraLines.length > 1 ? 's' : ''}` : 'Ajouté au panier',
    );
  };

  /** Ajoute un pack : la déclinaison choisie de l'appareil et une déclinaison de chaque article. */
  const addBundle = (itemVariantIds: string[]) => {
    if (!variant || status !== 'available') return;
    run([{ variantId: variant.id, quantity: 1 }, ...itemVariantIds.map((variantId) => ({ variantId, quantity: 1 }))], 'Pack ajouté');
  };

  return {
    selection,
    select,
    stateOf,
    variant,
    available,
    status,
    quantity,
    setQuantity: (q: number) => setQuantity(Math.max(1, Math.min(max, q))),
    max,
    images,
    extras,
    toggleExtra,
    add,
    addBundle,
    pending,
    message,
  };
}

export type Configurator = ReturnType<typeof useConfigurator>;
