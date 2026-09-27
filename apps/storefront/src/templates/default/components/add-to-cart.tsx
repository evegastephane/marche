'use client';

import type { Currency, ProductOption, StorefrontVariantDto } from '@marche/contracts';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { addToCart } from '@/actions/cart';
import { cn } from '@/lib/format';
import { Price } from './price';

/**
 * Choix de la déclinaison, quantité et ajout au panier. La disponibilité vient du serveur,
 * lue en direct au rendu de la page (jamais mise en cache).
 */
export function AddToCart({
  options,
  variants,
  availability,
  currency,
}: {
  options: ProductOption[];
  variants: StorefrontVariantDto[];
  availability: Record<string, number | null>;
  currency: Currency;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const firstInStock = variants.find((v) => availability[v.id] !== 0) ?? variants[0];
  const [selection, setSelection] = useState<string[]>(firstInStock?.optionValues ?? []);

  const variant = useMemo(
    () => variants.find((v) => v.optionValues.every((value, i) => value === selection[i])) ?? null,
    [variants, selection],
  );
  const available = variant ? availability[variant.id] : 0;
  const soldOut = !variant || available === 0;
  const max = available == null ? 99 : Math.min(99, available);

  /** Une valeur est grisée si aucune déclinaison en stock ne la combine avec le reste de la sélection. */
  const valueInStock = (optionIndex: number, value: string) =>
    variants.some(
      (v) =>
        v.optionValues[optionIndex] === value &&
        v.optionValues.every((val, i) => i === optionIndex || val === selection[i]) &&
        availability[v.id] !== 0,
    );

  const add = () => {
    if (!variant) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addToCart(variant.id, quantity);
      if (result.ok) {
        setMessage({ ok: true, text: 'Ajouté au panier' });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {variant && (
        <Price
          amount={variant.priceAmount}
          compareAt={variant.compareAtAmount}
          currency={currency}
          className="text-2xl"
        />
      )}

      {options.map((option, optionIndex) => (
        <fieldset key={option.name} className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">
            {option.name} : <span className="font-normal text-muted">{selection[optionIndex]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selection[optionIndex] === value;
              const inStock = valueInStock(optionIndex, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const next = [...selection];
                    next[optionIndex] = value;
                    setSelection(next);
                    setQuantity(1);
                    setMessage(null);
                  }}
                  className={cn(
                    'relative min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-200',
                    selected ? 'border-fg text-bg' : 'border-line hover:border-fg',
                    !inStock && 'text-muted line-through decoration-1',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId={`option-${optionIndex}`}
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-fg"
                      transition={{
                        type: 'spring',
                        bounce: 0.18,
                        duration: 0.38,
                      }}
                    />
                  )}
                  <span className="relative">{value}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className={cn('text-sm', soldOut ? 'font-semibold text-red-700' : 'text-muted')}>
        {!variant
          ? 'Cette combinaison n’existe pas.'
          : soldOut
            ? 'Épuisé pour le moment'
            : available != null && available <= 5
              ? `Plus que ${available} en stock`
              : 'En stock'}
      </p>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="inline-flex items-center rounded-full border border-line">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            disabled={quantity <= 1 || soldOut}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span
            className="tabular relative inline-flex h-11 w-8 items-center justify-center overflow-hidden font-semibold"
            aria-live="polite"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={quantity}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              >
                {quantity}
              </motion.span>
            </AnimatePresence>
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={quantity >= max || soldOut}
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <motion.button
          type="button"
          onClick={add}
          disabled={soldOut || pending}
          whileTap={{ scale: 0.96 }}
          whileHover={soldOut ? undefined : { y: -1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-7 font-semibold text-on-primary shadow-[0_10px_24px_-12px_var(--color-primary)] transition-opacity duration-150 disabled:opacity-50 sm:flex-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={message?.ok ? 'done' : 'idle'}
              className="inline-flex items-center gap-2"
              initial={reduce ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {message?.ok ? <Check className="size-5" /> : <ShoppingBag className="size-5" />}
              {soldOut ? 'Épuisé' : message?.ok ? 'Ajouté' : pending ? 'Ajout…' : 'Ajouter au panier'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        <AnimatePresence mode="wait">
          {message && !message.ok && (
            <motion.p
              key="erreur"
              className="font-semibold text-red-700"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              {message.text}
            </motion.p>
          )}
          {message?.ok && (
            <motion.a
              key="ok"
              href="/cart"
              className="group inline-flex items-center gap-1 font-semibold text-fg"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              Voir le panier{' '}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </motion.a>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
