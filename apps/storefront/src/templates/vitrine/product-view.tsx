'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Check, Minus, Plus, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { SpecSheet, specRows } from '@/components/shop/spec-sheet';
import { ServiceNotes, useConditionHint } from '@/components/shop/services';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, optionIndex, priceDelta, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';
import { MarkerNote } from './tag';

/**
 * Configurateur de la vitrine : l'appareil sur sa tablette de verre, les réglages en cartes
 * (stockage, couleur, état) et l'étiquette de prix qui pivote sur sa ficelle à chaque changement.
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
  const colorIdx = optionIndex(product, 'color');
  const conditionIdx = optionIndex(product, 'condition');
  const price = c.variant?.priceAmount ?? null;
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const warranty = typeof product.attributes.warrantyMonths === 'number' ? product.attributes.warrantyMonths : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="glass-shelf relative flex aspect-square items-end justify-center overflow-hidden px-6 pb-5">
          <span aria-hidden className="stand-shadow absolute bottom-3 left-1/2 h-6 w-1/2 -translate-x-1/2" />
          <AnimatePresence mode="wait" initial={false}>
            {main ? (
              <motion.img
                key={main.id}
                {...imageProps(main, '(min-width: 1024px) 50vw, 100vw')}
                alt={main.alt ?? product.title}
                className="relative max-h-full w-auto max-w-full object-contain"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : (
              <div className="flex size-full items-center justify-center font-heading text-3xl text-muted uppercase">{product.title}</div>
            )}
          </AnimatePresence>
          {/* Reflet sur la vitre quand la couleur change. */}
          {!reduce && colorIdx !== -1 && (
            <motion.span
              key={c.selection[colorIdx]}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-fg/12 to-transparent"
              initial={{ left: '-40%' }}
              animate={{ left: '120%' }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn(
                  'size-16 shrink-0 rounded-md bg-surface p-1.5 ring-1 transition-colors',
                  image.id === main?.id ? 'ring-primary' : 'ring-line hover:ring-fg/40',
                )}
              >
                <img {...imageProps(image, '64px')} alt="" loading="lazy" className="size-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {product.brand && <span className="font-heading text-sm font-bold tracking-[0.12em] text-muted uppercase">{product.brand.name}</span>}
          <h1 className="font-heading text-5xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-6xl">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-4 pt-3">
            {price !== null ? (
              <motion.span
                key={price}
                className="relative inline-flex origin-[0.9rem_50%]"
                initial={reduce ? false : { rotate: -14 }}
                animate={{ rotate: -3 }}
                transition={{ type: 'spring', stiffness: 260, damping: 7 }}
              >
                <span aria-hidden className="absolute -top-5 left-[0.85rem] h-6 w-px origin-bottom -rotate-12 bg-fg/50" />
                <span className="tabular relative inline-flex h-14 items-center overflow-hidden bg-primary pr-5 pl-9 font-heading text-3xl font-extrabold tracking-tight text-on-primary [clip-path:polygon(0.9rem_0,100%_0,100%_100%,0.9rem_100%,0_50%)]">
                  <span aria-hidden className="absolute top-1/2 left-[0.55rem] size-2 -translate-y-1/2 rounded-full bg-bg" />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={price}
                      initial={reduce ? false : { y: 22, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -22, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                    >
                      {formatMoney(price, currency)}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.span>
            ) : (
              <span className="font-heading text-2xl font-bold text-muted uppercase">Sur commande</span>
            )}
            {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
              <s className="tabular text-lg text-muted">
                <span className="sr-only">au lieu de </span>
                {formatMoney(c.variant.compareAtAmount, currency)}
              </s>
            )}
            {conditionIdx !== -1 && c.selection[conditionIdx] && <MarkerNote>{c.selection[conditionIdx]}</MarkerNote>}
          </div>
        </div>

        {product.options.map((option, index) => {
          const cards = option.type !== 'color' && option.type !== 'size' && option.type !== 'shoe_size';
          return (
            <fieldset key={option.name} className="flex flex-col gap-3">
              <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
                <span className="font-heading text-lg font-bold tracking-wide uppercase">
                  {option.name}
                  <span className="ml-3 font-body text-base font-medium tracking-normal text-muted normal-case">{c.selection[index]}</span>
                </span>
                {index === sizeIndex && sizeGuide && <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="text-muted" sheetClassName="rounded-t-xl sm:rounded-xl" />}
              </legend>
              <div className={cn(cards ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3' : 'flex flex-wrap gap-3')}>
                {option.values.map((value) => {
                  const selected = c.selection[index] === value;
                  const state = c.stateOf(index, value);
                  const swatch = swatchOf(option, value);
                  const delta = priceDelta(product, c.selection, index, value);
                  const hint = option.type === 'condition' ? conditionHint(value) : undefined;
                  if (swatch) {
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${value}${state === 'unoffered' ? ', sur commande' : state === 'soldout' ? ', épuisé' : ''}`}
                        title={value}
                        onClick={() => c.select(index, value)}
                        className={cn(
                          'relative size-12 rounded-full p-1 ring-2 transition-[box-shadow] duration-200',
                          selected ? 'ring-primary' : 'ring-transparent hover:ring-line',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn('block size-full rounded-full shadow-[inset_0_2px_6px_rgb(255_255_255/0.35),inset_0_-3px_6px_rgb(0_0_0/0.3)]', state !== 'available' && 'opacity-40')}
                          style={{ backgroundColor: swatch }}
                        />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => c.select(index, value)}
                      className={cn(
                        'relative flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border bg-surface px-4 py-3 text-left text-on-surface transition-[border-color,box-shadow] duration-200',
                        cards ? '' : 'min-w-16 items-center',
                        selected ? 'border-primary shadow-[0_0_0_1px_var(--color-primary),0_10px_24px_-14px_var(--color-primary)]' : 'border-line hover:border-fg/40',
                        state === 'unoffered' && 'border-dashed',
                      )}
                    >
                      <span className={cn('font-heading text-lg font-bold tracking-wide uppercase', state === 'soldout' && 'line-through decoration-2')}>{value}</span>
                      {hint && <span className="text-xs leading-snug text-on-surface/75">{hint}</span>}
                      {state === 'unoffered' ? (
                        <span className="text-xs font-semibold text-on-surface/75">Sur commande</span>
                      ) : state === 'soldout' ? (
                        <span className="text-xs font-semibold text-on-surface/75">Épuisé</span>
                      ) : (
                        delta !== null &&
                        delta !== 0 && (
                          <span className="tabular text-xs text-on-surface/75">
                            {delta > 0 ? '+' : '−'} {formatMoney(Math.abs(delta), currency)}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
          <span className={cn('inline-flex items-center gap-2', c.status === 'available' ? 'text-accent' : 'text-muted')}>
            <span aria-hidden className={cn('size-2.5 rounded-full', c.status === 'available' ? 'bg-accent shadow-[0_0_10px_var(--color-accent)]' : 'bg-muted')} />
            {c.status === 'unoffered' ? 'Configuration sur commande' : c.status === 'soldout' ? 'Épuisé : sur commande' : stockLabel(c.available)}
          </span>
          {warranty !== null && (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <ShieldCheck className="size-4" aria-hidden /> Garantie {warranty} mois
            </span>
          )}
        </div>

        <ServiceNotes product={product} selection={c.selection} omit={['warranty']} skin={{ list: 'text-sm', button: 'rounded-md border border-line bg-surface font-heading tracking-wide text-on-surface uppercase hover:border-fg/40', sheet: 'rounded-t-xl sm:rounded-xl' }} />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 text-on-surface">
            <p className="font-heading text-base font-bold tracking-wide uppercase">Complétez avec</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-line last:border-0" />
          </div>
        )}

        {c.status === 'available' ? (
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="inline-flex items-center rounded-md border border-line">
              <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                <Minus className="size-4" />
              </button>
              <span className="tabular inline-flex h-12 w-8 items-center justify-center font-heading text-xl font-bold" aria-live="polite">
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
              whileTap={{ scale: 0.97 }}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-8 font-heading text-lg font-extrabold tracking-wide text-on-primary uppercase shadow-[0_12px_28px_-14px_var(--color-primary)] disabled:opacity-60"
            >
              {c.message?.ok && <Check className="size-5" aria-hidden />}
              {c.message?.ok ? c.message.text : c.pending ? 'Ajout…' : 'Ajouter au panier'}
            </motion.button>
          </div>
        ) : (
          <SpecialRequestButton
            productSlug={product.slug}
            productTitle={product.title}
            options={product.options}
            selection={c.selection}
            className="min-h-12 rounded-md bg-primary px-8 font-heading text-lg font-extrabold tracking-wide text-on-primary uppercase"
            sheetClassName="rounded-t-xl sm:rounded-xl"
          />
        )}
        <div aria-live="polite" className="-mt-4 min-h-6 text-sm font-semibold">
          {c.message && !c.message.ok && <p>{c.message.text}</p>}
          {c.message?.ok && (
            <a href="/cart" className="text-fg">
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
            className="rounded-lg border-2 border-primary bg-surface p-4 text-on-surface"
            buttonClassName="rounded-md bg-primary text-on-primary font-heading uppercase tracking-wide"
          />
        ))}

        {product.description && (
          <div className="flex flex-col gap-3 border-t border-line pt-6 text-lg leading-relaxed text-fg/85">
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
        {specRows(product).length > 0 && (
          <section aria-labelledby="fiche-technique" className="flex flex-col gap-3">
            <h2 id="fiche-technique" className="font-heading text-2xl font-extrabold tracking-wide uppercase">
              Fiche technique
            </h2>
            <SpecSheet
              product={product}
              exclude={['compatibleModels']}
              className="rounded-lg border border-line bg-surface px-4 text-on-surface"
              rowClassName="border-b border-line last:border-0 text-sm"
            />
          </section>
        )}
      </div>
    </div>
  );
}
