'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Check, Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { SpecSheet } from '@/components/shop/spec-sheet';
import { ServiceNotes, useConditionHint } from '@/components/shop/services';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, priceDelta, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';

const plaque = 'border-4 border-line shadow-[4px_4px_0_var(--color-line)]';

/**
 * Fiche de la devanture : l'article dans son grand cadre peint, le nom en lettres de peintre sur le mur,
 * les déclinaisons en petites enseignes que l'on repeint en les choisissant.
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
  useEffect(() => setActive(0), [images]);
  const main = images[Math.min(active, images.length - 1)];
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const price = c.variant?.priceAmount ?? null;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
        <div className="painted-frame bg-surface p-4 sm:p-5">
          <div className="relative aspect-[4/5] overflow-hidden border-2 border-line bg-bg">
            <AnimatePresence mode="wait" initial={false}>
              {main ? (
                <motion.img
                  key={main.id}
                  {...imageProps(main, '(min-width: 1024px) 45vw, 100vw')}
                  alt={main.alt ?? product.title}
                  className="size-full object-cover"
                  initial={reduce ? false : { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
                  animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : (
                <div className="flex size-full items-center justify-center p-8 text-center font-heading text-4xl text-fg uppercase">{product.title}</div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex flex-wrap gap-3">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn(
                  'size-16 border-4 bg-surface p-1 transition-transform sm:size-20',
                  image.id === main?.id ? 'border-primary' : 'border-line hover:-translate-y-0.5',
                )}
              >
                <img {...imageProps(image, '80px')} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          {product.brand && <span className="text-sm font-bold tracking-[0.14em] text-muted uppercase">{product.brand.name}</span>}
          <h1 className="painted-shade font-heading text-5xl leading-[0.95] text-balance uppercase sm:text-6xl">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-4">
            {price !== null ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={price}
                  className={cn('tabular inline-flex -rotate-2 items-center bg-primary px-5 py-2 font-heading text-3xl text-on-primary', plaque)}
                  initial={reduce ? false : { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
                  animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {formatMoney(price, currency)}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span className={cn('inline-flex -rotate-2 bg-surface px-5 py-2 font-heading text-2xl text-on-surface uppercase', plaque)}>Sur commande</span>
            )}
            {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
              <s className="tabular text-lg text-muted">
                <span className="sr-only">au lieu de </span>
                {formatMoney(c.variant.compareAtAmount, currency)}
              </s>
            )}
          </div>
        </div>

        {product.options.map((option, index) => (
          <fieldset key={option.name} className="flex flex-col gap-3">
            <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2">
              <span className="font-heading text-lg tracking-wide uppercase">
                {option.name}
                <span className="ml-3 font-body text-base font-bold tracking-normal text-muted normal-case">{c.selection[index]}</span>
              </span>
              {index === sizeIndex && sizeGuide && (
                <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="font-bold text-fg underline decoration-primary decoration-2 underline-offset-4" sheetClassName="border-4 border-line bg-surface text-on-surface" />
              )}
            </legend>
            <div className="flex flex-wrap gap-3">
              {option.values.map((value) => {
                const selected = c.selection[index] === value;
                const state = c.stateOf(index, value);
                const swatch = swatchOf(option, value);
                const delta = priceDelta(product, c.selection, index, value);
                const hint = option.type === 'condition' ? conditionHint(value) : undefined;
                const status = state === 'unoffered' ? ', sur commande' : state === 'soldout' ? ', épuisé' : '';
                if (swatch) {
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${value}${status}`}
                      title={`${value}${status}`}
                      onClick={() => c.select(index, value)}
                      className={cn(
                        'relative inline-flex size-12 items-center justify-center rounded-full border-4 transition-transform duration-200',
                        selected ? 'scale-110 border-line shadow-[3px_3px_0_var(--color-line)]' : 'border-transparent hover:border-line/50',
                      )}
                    >
                      <span aria-hidden className={cn('size-full rounded-full border-2 border-line', state !== 'available' && 'opacity-40')} style={{ backgroundColor: swatch }} />
                      {state === 'soldout' && <span aria-hidden className="absolute h-[3px] w-10 rotate-45 bg-line" />}
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${value}${status}`}
                    title={hint}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => c.select(index, value)}
                    className={cn(
                      'brush-fill inline-flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 border-[3px] border-line bg-surface px-4 py-2 text-on-surface transition-shadow duration-200',
                      selected && 'shadow-[3px_3px_0_var(--color-line)]',
                      state === 'unoffered' && 'border-dashed',
                    )}
                  >
                    <span className={cn('font-heading text-lg leading-none uppercase', state === 'soldout' && 'line-through decoration-[3px]')}>{value}</span>
                    {state === 'unoffered' ? (
                      <span className="text-xs font-bold">sur commande</span>
                    ) : (
                      delta !== null &&
                      delta !== 0 && (
                        <span className="tabular text-xs font-bold">
                          {delta > 0 ? '+' : '−'} {formatMoney(Math.abs(delta), currency)}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
            {option.type === 'condition' && c.selection[index] && conditionHint(c.selection[index]!) && (
              <p className="text-sm text-muted">{conditionHint(c.selection[index]!)}</p>
            )}
          </fieldset>
        ))}

        <p className="inline-flex items-center gap-2.5 font-bold">
          <span aria-hidden className={cn('size-3 rounded-full border-2 border-line', c.status === 'available' ? 'bg-primary' : 'bg-surface')} />
          {c.status === 'unoffered'
            ? 'Cette combinaison se fait sur commande.'
            : c.status === 'soldout'
              ? 'Épuisé pour le moment : commandez-le.'
              : stockLabel(c.available)}
        </p>

        <ServiceNotes product={product} selection={c.selection} skin={{ list: 'font-semibold', button: 'border-[3px] border-line bg-surface font-heading text-on-surface uppercase', sheet: 'border-4 border-line bg-surface text-on-surface' }} />

        {product.accessories.length > 0 && (
          <div className="painted-frame flex flex-col gap-1 bg-surface px-7 py-6 text-on-surface">
            <p className="font-heading text-lg uppercase">Avec ça</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b-2 border-line/20 last:border-0" />
          </div>
        )}

        {c.status === 'available' ? (
          <div className="flex flex-wrap items-stretch gap-4">
            <div className={cn('inline-flex items-center bg-surface text-on-surface', plaque)}>
              <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                <Minus className="size-4" strokeWidth={3} />
              </button>
              <span className="tabular inline-flex h-12 w-8 items-center justify-center font-heading text-xl" aria-live="polite">
                {c.quantity}
              </span>
              <button type="button" aria-label="Augmenter la quantité" disabled={c.quantity >= c.max} onClick={() => c.setQuantity(c.quantity + 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                <Plus className="size-4" strokeWidth={3} />
              </button>
            </div>
            <motion.button
              type="button"
              onClick={c.add}
              disabled={c.pending}
              whileTap={{ x: 3, y: 3, boxShadow: '0 0 0 var(--color-line)' }}
              className={cn('inline-flex min-h-14 flex-1 items-center justify-center gap-2.5 bg-primary px-8 font-heading text-xl text-on-primary uppercase disabled:opacity-60', plaque)}
            >
              {c.message?.ok && <Check className="size-5" strokeWidth={3} aria-hidden />}
              {c.message?.ok ? c.message.text : c.pending ? 'Un instant…' : 'Ajouter au panier'}
            </motion.button>
          </div>
        ) : (
          <SpecialRequestButton
            productSlug={product.slug}
            productTitle={product.title}
            options={product.options}
            selection={c.selection}
            className={cn('min-h-14 bg-primary px-8 font-heading text-xl text-on-primary uppercase', plaque)}
            sheetClassName="border-4 border-line bg-surface text-on-surface"
          />
        )}
        <div aria-live="polite" className="-mt-4 min-h-6 font-bold">
          {c.message && !c.message.ok && <p>{c.message.text}</p>}
          {c.message?.ok && (
            <a href="/cart" className="text-fg underline decoration-primary decoration-2 underline-offset-4">
              Voir le panier →
            </a>
          )}
        </div>

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="painted-frame bg-surface px-7 py-6 text-on-surface"
            buttonClassName="border-[3px] border-line bg-primary text-on-primary font-heading uppercase"
          />
        ))}

        {(product.description || Object.keys(product.attributes).length > 0) && (
          <div className="painted-frame flex flex-col gap-6 bg-surface px-7 py-8 text-on-surface sm:px-10">
            {product.description && (
              <div className="flex flex-col gap-4 text-lg leading-relaxed">
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
            {Object.keys(product.attributes).length > 0 && (
              <section aria-labelledby="details" className="flex flex-col gap-2">
                <h2 id="details" className="font-heading text-xl uppercase">
                  Détails
                </h2>
                <SpecSheet kind={product.kind} attributes={product.attributes} exclude={['compatibleModels']} rowClassName="border-b-2 border-line/20 last:border-0" />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
