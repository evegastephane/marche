'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Minus, Plus, Scissors } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { specRows } from '@/components/shop/spec-sheet';
import { ServiceNotes, useConditionHint } from '@/components/shop/services';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';
import { InkCircle, InkStrike, Stamp } from './ink';

const label = 'font-heading text-xs font-bold tracking-[0.14em] uppercase [font-stretch:80%]';

/**
 * Fiche du cahier : photos collées à gauche, bon de commande à droite. On entoure sa taille
 * et sa couleur au stylo ; « Ajouter » détache le bon et l'atelier le tamponne.
 */
export function ProductView({
  product,
  availability,
  currency,
  sizeGuide,
}: {
  product: StorefrontProductDto;
  availability: Availability;
  currency: Currency;
  sizeGuide: SizeGuide | null;
}) {
  const reduce = useReducedMotion();
  const c = useConfigurator(product, availability);
  const conditionHint = useConditionHint();
  const [active, setActive] = useState(0);
  const images = c.images;
  // Nouvelle couleur, nouvelles photos : on revient à la première.
  useEffect(() => setActive(0), [images]);
  const main = images[Math.min(active, images.length - 1)];
  const notes = specRows(product, ['audience', 'origin']);
  const origin = typeof product.attributes.origin === 'string' ? product.attributes.origin : null;
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
        <div className="relative mx-auto w-full max-w-lg -rotate-1 bg-surface p-3 pb-6 shadow-[0_2px_2px_rgb(0_0_0/0.06),0_28px_44px_-22px_rgb(0_0_0/0.5)]">
          <span aria-hidden className="tape top-0 left-6 z-10 -translate-y-1/2 -rotate-12" />
          <span aria-hidden className="tape top-0 right-6 z-10 -translate-y-1/2 rotate-12" />
          <div className="aspect-[4/5] overflow-hidden bg-bg">
            <AnimatePresence mode="wait" initial={false}>
              {main ? (
                <motion.img
                  key={main.id}
                  {...imageProps(main, '(min-width: 1024px) 45vw, 100vw')}
                  alt={main.alt ?? product.title}
                  className="size-full object-cover"
                  initial={reduce ? false : { opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                />
              ) : (
                <div className="flex size-full items-center justify-center p-8 text-center font-hand text-3xl text-muted">{product.title}</div>
              )}
            </AnimatePresence>
          </div>
          {origin && (
            <span className="absolute -right-3 bottom-10 rotate-6 border border-fg/30 bg-bg px-3 py-1.5 font-hand text-base text-accent shadow-[0_6px_14px_-8px_rgb(0_0_0/0.4)]">
              {origin}
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex flex-wrap justify-center gap-4">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn(
                  'size-16 bg-surface p-1 shadow-[0_6px_12px_-8px_rgb(0_0_0/0.45)] transition-transform sm:size-20',
                  i % 2 ? 'rotate-2' : '-rotate-2',
                  image.id === main?.id ? 'ring-2 ring-accent' : 'hover:-translate-y-0.5',
                )}
              >
                <img {...imageProps(image, '80px')} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 border-b-2 border-fg pb-4">
          {product.brand && <span className={cn(label, 'text-muted')}>{product.brand.name}</span>}
          <h1 className="font-heading text-4xl leading-[0.95] font-extrabold uppercase [font-stretch:76%] sm:text-5xl">{product.title}</h1>
          {c.variant && (
            <p className="flex flex-wrap items-baseline gap-3 font-hand text-3xl leading-none font-bold text-accent">
              {formatMoney(c.variant.priceAmount, currency)}
              {c.variant.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
                <s className="text-xl font-normal text-muted">
                  <span className="sr-only">au lieu de </span>
                  {formatMoney(c.variant.compareAtAmount, currency)}
                </s>
              )}
            </p>
          )}
        </div>

        {product.options.map((option, index) => (
          <fieldset key={option.name} className="flex flex-col gap-3">
            <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2">
              <span className={label}>
                {option.name} <span className="ml-2 font-hand text-lg font-bold tracking-normal text-accent normal-case">{c.selection[index]}</span>
              </span>
              {index === sizeIndex && sizeGuide && (
                <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="font-hand text-base font-bold text-accent" sheetClassName="ruled-paper text-fg">
                  guide des mesures →
                </SizeGuideButton>
              )}
            </legend>
            <div className={cn('flex flex-wrap', option.type === 'color' ? 'gap-4' : 'border-y border-l border-fg/50')}>
              {option.values.map((value) => {
                const selected = c.selection[index] === value;
                const state = c.stateOf(index, value);
                const swatch = swatchOf(option, value);
                const hint = option.type === 'condition' ? conditionHint(value) : undefined;
                const status = state === 'unoffered' ? ', sur demande' : state === 'soldout' ? ', épuisé' : '';
                return swatch ? (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${value}${status}`}
                    title={`${value}${status}`}
                    onClick={() => c.select(index, value)}
                    className="relative inline-flex size-12 items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className={cn('size-9 rounded-full ring-1 ring-fg/25', state === 'unoffered' && 'opacity-40')}
                      style={{ backgroundColor: swatch }}
                    />
                    {state === 'soldout' && <InkStrike className="rotate-[-35deg]" />}
                    {selected && <InkCircle key={`${index}-${value}`} />}
                  </button>
                ) : (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${value}${status}`}
                    title={hint ?? `${value}${status}`}
                    onClick={() => c.select(index, value)}
                    className={cn(
                      'relative inline-flex min-h-12 min-w-14 items-center justify-center border-r border-fg/50 px-3 font-heading text-base font-bold tabular-nums [font-stretch:85%]',
                      state !== 'available' && 'text-muted',
                      state === 'unoffered' && 'font-normal italic',
                    )}
                  >
                    {value}
                    {state === 'soldout' && <InkStrike />}
                    {selected && <InkCircle key={`${index}-${value}`} className="-inset-x-0.5 -inset-y-0.5 w-[calc(100%+0.25rem)]" />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <p className="font-hand text-xl leading-snug text-accent">
          {c.status === 'unoffered'
            ? 'Pas dans cette combinaison : l’atelier peut la faire sur mesure.'
            : c.status === 'soldout'
              ? 'Épuisée pour le moment : demandez-la sur mesure.'
              : stockLabel(c.available)}
        </p>

        <ServiceNotes product={product} selection={c.selection} skin={{ item: 'border-b border-dashed border-line pb-3 last:border-0', detail: 'font-hand text-base text-accent opacity-100', button: 'border border-fg/40 bg-surface font-heading text-sm tracking-[0.1em] uppercase [font-stretch:82%]', sheet: 'ruled-paper text-fg' }} />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-1 border-y border-fg/40 py-4">
            <p className={label}>À assortir</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-dashed border-line last:border-0" />
          </div>
        )}

        {c.status === 'available' ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center border border-fg/50">
              <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                <Minus className="size-4" />
              </button>
              <span className="inline-flex h-12 w-10 items-center justify-center border-x border-fg/50 font-hand text-xl font-bold text-accent" aria-live="polite">
                {c.quantity}
              </span>
              <button type="button" aria-label="Augmenter la quantité" disabled={c.quantity >= c.max} onClick={() => c.setQuantity(c.quantity + 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                <Plus className="size-4" />
              </button>
            </div>
            <motion.button
              type="button"
              onClick={c.add}
              disabled={c.pending}
              whileTap={{ y: 2, rotate: -1 }}
              className="relative inline-flex min-h-14 flex-1 items-center justify-center gap-3 border-l-2 border-dashed border-on-primary/50 bg-primary px-7 font-heading text-base font-bold tracking-[0.1em] text-on-primary uppercase [font-stretch:82%] disabled:opacity-60 sm:flex-none"
            >
              <Scissors className="size-5 -rotate-90" strokeWidth={1.8} aria-hidden />
              {c.pending ? 'Un instant…' : 'Ajouter au panier'}
            </motion.button>
            <AnimatePresence>
              {c.message?.ok && (
                <motion.a href="/cart" exit={{ opacity: 0 }} className="no-underline">
                  <Stamp>{c.message.text}</Stamp>
                </motion.a>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <SpecialRequestButton
            productSlug={product.slug}
            productTitle={product.title}
            options={product.options}
            selection={c.selection}
            label="Commander sur mesure"
            className="inline-flex min-h-14 items-center justify-center gap-3 border-l-2 border-dashed border-on-primary/50 bg-primary px-7 font-heading font-bold tracking-[0.1em] text-on-primary uppercase [font-stretch:82%]"
            sheetClassName="ruled-paper text-fg"
          />
        )}
        {c.message && !c.message.ok && (
          <p role="alert" className="font-hand text-lg font-bold text-primary">
            {c.message.text}
          </p>
        )}
        {c.message?.ok && (
          <a href="/cart" className="font-hand text-lg font-bold text-accent">
            voir le panier →
          </a>
        )}

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="relative rotate-[0.4deg] border border-fg/30 bg-surface p-5 shadow-[0_12px_24px_-16px_rgb(0_0_0/0.45)]"
            buttonClassName="bg-fg text-bg font-heading uppercase tracking-[0.08em] [font-stretch:82%]"
          />
        ))}

        {(notes.length > 0 || product.description) && (
          <div className="ruled-paper -mx-4 flex flex-col gap-6 px-4 py-6 sm:mx-0 sm:pl-16">
            {product.description && (
              <div className="flex flex-col gap-4 leading-8">
                {product.description
                  .split(/\n{2,}/)
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i} className="max-w-[60ch]">
                      {p}
                    </p>
                  ))}
              </div>
            )}
            {notes.length > 0 && (
              <dl className="flex flex-col">
                {notes.map((row) => (
                  <div key={row.key} className="grid grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-3 leading-8">
                    <dt className={label}>{row.label}</dt>
                    <dd className="font-hand text-xl text-accent">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
