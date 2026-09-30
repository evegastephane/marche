'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { ServiceNotes, useConditionHint } from '@/components/shop/services';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { SpecSheet, specRows } from '@/components/shop/spec-sheet';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, priceDelta, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';
import { LivePrice } from './live-price';

const label = 'text-[0.8125rem] font-bold tracking-[0.12em] text-muted uppercase';

/** Voyant d'un réglage : allumé quand il est choisi, éteint (en fantôme) sinon. */
function Lamp({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-2.5 shrink-0 rounded-full bg-primary transition-[opacity,box-shadow] duration-150',
        on ? 'opacity-100 shadow-[0_0_10px_1px_var(--color-primary)]' : 'opacity-20',
        className,
      )}
    />
  );
}

/**
 * La fiche : l'appareil sur l'étal éclairé, et à côté son nom, son prix allumé,
 * puis les réglages (stockage, couleur, état) avec leur voyant. Le prix se rallume à chaque réglage.
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
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const paragraphs = (product.description ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasSheet = specRows(product).length > 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="lit-shelf relative aspect-square overflow-hidden rounded-md p-8 sm:p-12">
          <AnimatePresence mode="wait" initial={false}>
            {main ? (
              <motion.img
                key={main.id}
                {...imageProps(main, '(min-width: 1024px) 46vw, 100vw')}
                alt={main.alt ?? product.title}
                className="size-full object-contain mix-blend-multiply"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            ) : (
              <span className="flex size-full items-center justify-center text-center text-3xl font-bold">{product.title}</span>
            )}
          </AnimatePresence>
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
                  'lit-shelf size-16 rounded-[4px] p-1.5 outline-offset-2',
                  image.id === main?.id ? 'outline-2 outline-primary' : 'opacity-70 hover:opacity-100',
                )}
              >
                <img {...imageProps(image, '64px')} alt="" loading="lazy" className="size-full object-contain mix-blend-multiply" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-4">
          <h1 className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.02em] text-balance">{product.title}</h1>
          {(product.brand || c.variant?.sku) && (
            <p className="text-[0.9375rem] text-muted">
              {product.brand?.name}
              {product.brand && c.variant?.sku && ' · '}
              {c.variant?.sku && <span className="tabular">Réf. {c.variant.sku}</span>}
            </p>
          )}
          <div className="led-board flex flex-wrap items-end gap-x-5 gap-y-2 rounded-md border border-line px-5 py-5">
            {c.variant ? (
              <LivePrice amount={c.variant.priceAmount} currency={currency} className="led-glow text-[clamp(3rem,6vw,4.5rem)]" />
            ) : (
              <span
                className="led-text text-[2.25rem] leading-none font-extrabold uppercase"
                style={{ color: 'var(--color-accent)', textShadow: '0 0 0.4em color-mix(in oklab, var(--color-accent) 45%, transparent)' }}
              >
                Sur commande
              </span>
            )}
            {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
              <s className="tabular pb-1 text-lg text-muted">
                <span className="sr-only">au lieu de </span>
                {formatMoney(c.variant.compareAtAmount, currency)}
              </s>
            )}
          </div>
        </div>

        {product.options.map((option, index) => (
          <fieldset key={option.name} className="flex min-w-0 flex-col gap-3">
            <legend className="sr-only">{option.name}</legend>
            <div aria-hidden className="flex items-baseline justify-between gap-3">
              <span className={label}>{option.name}</span>
              {index === sizeIndex && sizeGuide && (
                <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="text-sm font-bold underline" sheetClassName="bg-bg text-fg" />
              )}
            </div>
            <div role="radiogroup" aria-label={option.name} className={cn('grid gap-2', option.values.length > 2 && 'sm:grid-cols-2')}>
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
                    className={cn(
                      'flex min-h-14 items-center gap-3 rounded-md border px-4 py-2.5 text-left transition-colors duration-150',
                      selected ? 'border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]' : 'border-line hover:border-fg/40',
                    )}
                  >
                    <Lamp on={selected} />
                    {swatch && <span aria-hidden className="size-4 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)]" style={{ backgroundColor: swatch }} />}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn('text-base font-bold', state === 'soldout' && 'text-muted line-through', state === 'unoffered' && 'text-muted')}>{value}</span>
                      {hint && <span className="text-[0.8125rem] leading-snug text-muted">{hint}</span>}
                    </span>
                    <span className="tabular shrink-0 text-sm font-bold text-muted">
                      {state === 'unoffered' ? 'sur commande' : state === 'soldout' ? 'épuisé' : delta ? `${delta > 0 ? '+' : '−'} ${formatMoney(Math.abs(delta), currency)}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2.5 text-[0.9375rem] font-bold">
            <Lamp on={c.status === 'available'} />
            {c.status === 'unoffered' ? 'Sur commande' : c.status === 'soldout' ? 'Épuisé' : stockLabel(c.available)}
          </p>
          {c.status === 'available' ? (
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="inline-flex items-center rounded-md border border-line">
                <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-14 items-center justify-center disabled:opacity-35">
                  <Minus className="size-4" strokeWidth={2.4} />
                </button>
                <span className="tabular inline-flex h-14 w-8 items-center justify-center text-lg font-bold" aria-live="polite">
                  {c.quantity}
                </span>
                <button type="button" aria-label="Augmenter la quantité" disabled={c.quantity >= c.max} onClick={() => c.setQuantity(c.quantity + 1)} className="flex size-14 items-center justify-center disabled:opacity-35">
                  <Plus className="size-4" strokeWidth={2.4} />
                </button>
              </div>
              <motion.button
                type="button"
                onClick={c.add}
                disabled={c.pending}
                whileTap={reduce ? undefined : { scale: 0.985 }}
                className="lit-button inline-flex min-h-14 min-w-[14rem] flex-1 items-center justify-center rounded-md px-8 text-lg font-bold disabled:opacity-75"
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
              className="lit-button inline-flex min-h-14 items-center justify-center self-start rounded-md px-8 text-lg font-bold"
              sheetClassName="bg-bg text-fg"
            />
          )}
          <div aria-live="polite" className="min-h-6 text-[0.9375rem] font-bold">
            {c.message && !c.message.ok && <p>{c.message.text}</p>}
            {c.message?.ok && (
              <a href="/cart" className="text-fg underline decoration-primary decoration-2 underline-offset-4">
                Voir le panier →
              </a>
            )}
          </div>
        </div>

        <ServiceNotes
          product={product}
          selection={c.selection}
          skin={{
            list: 'text-[0.9375rem]',
            item: '[&_svg]:text-primary',
            button: 'rounded-md border border-fg/40 hover:border-fg',
            sheet: 'bg-bg text-fg',
          }}
        />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-line px-5 py-4">
            <p className={label}>Avec l’appareil</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-line last:border-0" />
          </div>
        )}

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="rounded-md border border-primary p-5"
            buttonClassName="lit-button rounded-md font-bold"
          />
        ))}

        {paragraphs.length > 0 && (
          <div className="flex flex-col gap-4 text-lg leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="max-w-[62ch]">
                {p}
              </p>
            ))}
          </div>
        )}
        {hasSheet && (
          <section aria-labelledby="caracteristiques" className="flex flex-col gap-4">
            <h2 id="caracteristiques" className="led-text led-glow text-[2rem] leading-none font-extrabold uppercase">
              Caractéristiques
            </h2>
            <SpecSheet
              product={product}
              exclude={['compatibleModels']}
              className="rounded-md border border-line px-5 py-2 text-[0.9375rem]"
              rowClassName="border-b border-line py-2.5 last:border-0"
            />
          </section>
        )}
      </div>
    </div>
  );
}
