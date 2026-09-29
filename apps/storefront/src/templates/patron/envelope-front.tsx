'use client';

import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import { Scissors } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { CutFrame, Grainline, Notches, VIEW_LETTERS, ViewLetter } from './cut';

/**
 * Recto de l'enveloppe : la grande photo dans son tracé de coupe, avec flèche de droit-fil et crans,
 * et les vues lettrées A, B, C du modèle vedette. Survoler une vue la montre avant de l'ouvrir.
 */
export function EnvelopeFront({
  products,
  currency,
  ctaLabel,
  ctaHref,
}: {
  products: StorefrontProductCardDto[];
  currency: Currency;
  ctaLabel: string | null;
  ctaHref: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const current = products[active];

  return (
    <div className="flex flex-col gap-6">
      {products.length > 0 && (
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <CutFrame className="bg-bg">
          <Link href={current ? `/products/${current.slug}` : '/collections'} className="relative block aspect-[4/5] overflow-hidden bg-surface" tabIndex={-1} aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              {current?.image && (
                <motion.img
                  key={current.id}
                  {...imageProps(current.image, '(min-width: 1024px) 40vw, 90vw')}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  fetchPriority="high"
                  initial={reduce ? false : { opacity: 0, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </AnimatePresence>
            {current && !current.image && (
              <span className="absolute inset-0 flex items-center justify-center p-6 text-center font-heading text-3xl font-black uppercase [font-stretch:115%]">
                {current.title}
              </span>
            )}
          </Link>
          <Notches className="absolute -bottom-[0.55rem] left-1/3 bg-bg" />
          <Notches className="absolute -bottom-[0.55rem] left-2/3 bg-bg" />
        </CutFrame>
        <div className="flex flex-col items-center gap-2 py-6">
          <Grainline className="flex-1" />
          <span className="font-heading text-[0.625rem] font-bold tracking-[0.16em] uppercase [writing-mode:vertical-rl] [font-stretch:75%]">Droit fil</span>
        </div>
      </div>
      )}

      {products.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-3" aria-label="Vues du modèle">
          {products.map((product, index) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.slug}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="group flex min-h-14 items-center gap-3 border-t-[1.5px] border-fg py-2 text-fg no-underline"
              >
                <ViewLetter letter={VIEW_LETTERS[index]!} active={index === active} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-heading text-sm leading-tight font-black uppercase [font-stretch:105%] group-hover:underline">{product.title}</span>
                  <span className="tabular text-sm">{formatMoney(product.priceMinAmount, currency)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {ctaLabel && (
        <Link
          href={ctaHref}
          className="group relative self-end border-[1.5px] border-dashed border-fg p-1.5 no-underline"
        >
          <Scissors
            aria-hidden
            strokeWidth={1.8}
            className={cn(
              'absolute -top-[0.7rem] left-3 size-5 bg-bg px-0.5 text-fg',
              !reduce && 'transition-[left] duration-700 ease-out-soft group-hover:left-[calc(100%-2rem)]',
            )}
          />
          <span className="inline-flex min-h-12 items-center gap-3 bg-fg px-6 font-heading text-base font-bold tracking-[0.08em] text-bg uppercase [font-stretch:82%]">
            {ctaLabel} →
          </span>
        </Link>
      )}
    </div>
  );
}
