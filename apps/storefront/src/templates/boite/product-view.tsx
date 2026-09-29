'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Minus, Plus } from 'lucide-react';
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
import { Barcode } from './barcode';
import { BoxFront, WarrantySeal } from './box';

const caption = 'font-hand text-[0.6875rem] tracking-[0.16em] uppercase';

/** Case de l'étiquette : cochée, la coche se trace à l'encre de la couleur d'action. */
function Check({ checked }: { checked: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center border-[1.5px] transition-colors duration-150',
        checked ? 'border-primary bg-primary text-on-primary' : 'border-on-surface',
      )}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3.5">
          <motion.path
            d="M3 8.5 L6.5 12 L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        </svg>
      )}
    </span>
  );
}

/**
 * Fiche de la boîte : à gauche la boîte de face (elle se tourne au survol), à droite son étiquette latérale.
 * On y coche capacité, couleur et état ; la référence choisie se réimprime en code-barres.
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
  const main = images[Math.min(active, images.length - 1)] ?? null;
  const warranty = typeof product.attributes.warrantyMonths === 'number' ? product.attributes.warrantyMonths : null;
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const price = c.variant?.priceAmount ?? null;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="group relative pt-3.5 pr-3.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={main?.id ?? 'none'}
              initial={reduce ? false : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <BoxFront
                image={main}
                title={product.title}
                brand={product.brand?.name ?? null}
                sizes="(min-width: 1024px) 45vw, 90vw"
                priority
                className="aspect-[5/6] transition-transform duration-700 ease-out-soft group-hover:[transform:perspective(1400px)_rotateY(-7deg)] motion-reduce:transition-none"
              />
            </motion.div>
          </AnimatePresence>
          {warranty !== null && <WarrantySeal months={warranty} className="absolute -bottom-6 -left-3 bg-bg sm:-left-6" />}
        </div>
        {images.length > 1 && (
          <div className="flex flex-wrap gap-3 pt-4">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn('size-16 border-[1.5px] bg-bg p-1', image.id === main?.id ? 'border-primary' : 'border-line hover:border-fg/50')}
              >
                <img {...imageProps(image, '64px')} alt="" loading="lazy" className="size-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col border border-line bg-surface text-on-surface">
          <div className="flex flex-col gap-3 border-b border-line p-5 sm:p-7">
            <span className={cn(caption, 'opacity-70')}>{product.brand?.name ?? 'Modèle'}</span>
            <h1 className="text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-balance">{product.title}</h1>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
              {price !== null ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={price}
                    className="tabular text-3xl font-semibold tracking-[-0.02em] text-primary"
                    initial={reduce ? false : { y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  >
                    {formatMoney(price, currency)}
                  </motion.span>
                </AnimatePresence>
              ) : (
                <span className="text-2xl font-semibold">Sur commande</span>
              )}
              {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
                <s className="tabular text-lg opacity-45">
                  <span className="sr-only">au lieu de </span>
                  {formatMoney(c.variant.compareAtAmount, currency)}
                </s>
              )}
            </div>
          </div>

          {product.options.map((option, index) => (
            <fieldset key={option.name} className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:px-7">
              <legend className="sr-only">{option.name}</legend>
              <div className="flex items-baseline justify-between gap-3 pb-1">
                <span aria-hidden className={caption}>
                  {option.name}
                </span>
                {index === sizeIndex && sizeGuide && (
                  <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="font-hand text-xs underline" sheetClassName="border border-line bg-surface text-on-surface" />
                )}
              </div>
              <div role="radiogroup" aria-label={option.name} className={cn('grid gap-x-6', option.values.length > 3 && 'sm:grid-cols-2')}>
                {option.values.map((value) => {
                  const selected = c.selection[index] === value;
                  const state = c.stateOf(index, value);
                  const swatch = swatchOf(option, value);
                  const delta = priceDelta(product, c.selection, index, value);
                  const hint = option.type === 'condition' ? conditionHint(value) : undefined;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => c.select(index, value)}
                      className="flex min-h-11 items-center gap-3 py-1.5 text-left"
                    >
                      <Check checked={selected} />
                      {swatch && <span aria-hidden className="size-4 shrink-0 border border-on-surface/40" style={{ backgroundColor: swatch }} />}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn('text-[0.9375rem] font-medium', state === 'soldout' && 'line-through', state === 'unoffered' && 'opacity-60')}>{value}</span>
                        {hint && <span className="text-xs leading-snug opacity-70">{hint}</span>}
                      </span>
                      <span className="tabular shrink-0 font-hand text-xs">
                        {state === 'unoffered' ? 'sur commande' : state === 'soldout' ? 'épuisé' : delta ? `${delta > 0 ? '+' : '−'} ${formatMoney(Math.abs(delta), currency)}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line px-5 py-4 sm:px-7">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-hand text-xs">
              <dt className="tracking-[0.16em] uppercase opacity-70">Stock</dt>
              <dd className={cn('font-semibold', c.status === 'available' && 'text-primary')}>
                {c.status === 'unoffered' ? 'Sur commande' : c.status === 'soldout' ? 'Épuisé' : stockLabel(c.available)}
              </dd>
              {c.variant?.sku && (
                <>
                  <dt className="tracking-[0.16em] uppercase opacity-70">Réf.</dt>
                  <dd className="tabular">{c.variant.sku}</dd>
                </>
              )}
            </dl>
            {c.variant?.sku && <Barcode value={c.variant.sku} className="w-48" />}
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-7">
            {c.status === 'available' ? (
              <div className="flex flex-wrap items-stretch gap-3">
                <div className="inline-flex items-center border-[1.5px] border-on-surface">
                  <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                    <Minus className="size-4" />
                  </button>
                  <span className="tabular inline-flex h-12 w-8 items-center justify-center font-hand text-base" aria-live="polite">
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
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-primary px-8 text-base font-semibold text-on-primary shadow-[0_14px_26px_-16px_var(--color-primary)] disabled:opacity-70"
                >
                  {c.message?.ok ? c.message.text : c.pending ? 'Ajout…' : 'Ajouter au panier'}
                </motion.button>
              </div>
            ) : (
              <SpecialRequestButton
                productSlug={product.slug}
                productTitle={product.title}
                options={product.options}
                selection={c.selection}
                className="min-h-12 bg-primary px-8 font-semibold text-on-primary"
                sheetClassName="border border-line bg-surface text-on-surface"
              />
            )}
            <div aria-live="polite" className="min-h-5 text-sm font-medium">
              {c.message && !c.message.ok && <p>{c.message.text}</p>}
              {c.message?.ok && (
                <a href="/cart" className="text-on-surface underline decoration-primary decoration-2 underline-offset-4">
                  Voir le panier →
                </a>
              )}
            </div>
          </div>
        </div>

        <ServiceNotes product={product} selection={c.selection} omit={['warranty']} skin={{ list: 'text-sm', button: 'border-[1.5px] border-fg text-fg', sheet: 'border border-line bg-surface text-on-surface' }} />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-1 border border-line bg-surface px-5 py-4 text-on-surface sm:px-7">
            <p className={caption}>Avec l’appareil</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-line last:border-0" />
          </div>
        )}

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="border-[1.5px] border-primary bg-surface p-5 text-on-surface"
            buttonClassName="bg-primary text-on-primary font-semibold"
          />
        ))}

        {product.description && (
          <div className="flex flex-col gap-4 text-lg leading-relaxed">
            {product.description
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i} className="max-w-[62ch]">
                  {p}
                </p>
              ))}
          </div>
        )}
        {Object.keys(product.attributes).length > 0 && (
          <section aria-labelledby="caracteristiques" className="flex flex-col gap-3">
            <h2 id="caracteristiques" className="text-2xl font-semibold tracking-[-0.02em]">
              Caractéristiques
            </h2>
            <SpecSheet
              kind={product.kind}
              attributes={product.attributes}
              exclude={['compatibleModels']}
              className="border-y border-line font-hand text-[0.8125rem]"
              rowClassName="border-b border-line last:border-0"
            />
          </section>
        )}
      </div>
    </div>
  );
}
