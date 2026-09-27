'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateCartLine } from '@/actions/cart';

export function CartLineControls({
  variantId,
  quantity,
  max,
  title,
}: {
  variantId: string;
  quantity: number;
  max: number | null;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (next: number) =>
    startTransition(async () => {
      setError(null);
      const result = await updateCartLine(variantId, next);
      if (!result.ok) setError(result.message);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2" aria-busy={pending}>
        <div className="inline-flex items-center rounded-full border border-line">
          <button
            type="button"
            aria-label={`Retirer un ${title}`}
            disabled={pending || quantity <= 1}
            onClick={() => set(quantity - 1)}
            className="flex size-10 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="tabular w-7 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            aria-label={`Ajouter un ${title}`}
            disabled={pending || (max != null && quantity >= max)}
            onClick={() => set(quantity + 1)}
            className="flex size-10 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => set(0)}
          disabled={pending}
          className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-fg"
          aria-label={`Retirer ${title} du panier`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
