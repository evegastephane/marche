'use client';

import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/format';
import { PriceBoard, TileGrid } from './product-card';

const VIEWS = [
  { id: 'vitrine', label: 'Vitrine', icon: LayoutGrid },
  { id: 'tableau', label: 'Tableau des prix', icon: Rows3 },
] as const;

/** Le rayon se regarde en vitrine (les photos) ou se lit en tableau des prix (pour comparer). */
export function CatalogView({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('vitrine');
  return (
    <div className="flex flex-col gap-8">
      <div role="group" aria-label="Affichage" className="inline-flex self-start rounded-md border border-line p-1">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-[4px] px-3.5 text-sm font-bold transition-colors',
              view === id ? 'lit-button' : 'text-muted hover:text-fg',
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </div>
      {view === 'vitrine' ? <TileGrid products={products} currency={currency} /> : <PriceBoard products={products} currency={currency} />}
    </div>
  );
}
