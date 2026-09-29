'use client';

import type { Currency, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { SpecSheet } from '@/components/shop/spec-sheet';
import { ServiceNotes, useConditionHint } from '@/components/shop/services';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, priceDelta, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from './media';
import { Price } from './price';

/** Fiche produit du template natif : galerie qui suit la couleur, options, accessoires et packs. */
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
  const [main, ...others] = c.images;
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-soft">
          <AnimatePresence mode="wait" initial={false}>
            {main ? (
              <motion.img
                key={main.id}
                {...imageProps(main, '(min-width: 1024px) 55vw, 100vw')}
                alt={main.alt ?? product.title}
                className="size-full object-cover"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            ) : (
              <div className="flex size-full items-center justify-center p-8 text-center font-heading text-3xl text-muted">
                {product.title}
              </div>
            )}
          </AnimatePresence>
        </div>
        {others.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {others.slice(0, 8).map((image) => (
              <div key={image.id} className="aspect-square overflow-hidden rounded-lg bg-soft">
                <img {...imageProps(image, '15vw')} alt={image.alt ?? product.title} loading="lazy" className="size-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-2">
          {product.brand && <span className="text-sm font-semibold tracking-wide text-muted uppercase">{product.brand.name}</span>}
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{product.title}</h1>
          {c.variant && (
            <Price amount={c.variant.priceAmount} compareAt={c.variant.compareAtAmount} currency={currency} className="text-2xl" />
          )}
        </div>

        {product.options.map((option, index) => {
          const cards = option.type === 'storage' || option.type === 'condition' || option.type === 'memory' || option.type === 'screen';
          return (
            <fieldset key={option.name} className="flex flex-col gap-2.5">
              <legend className="mb-2.5 flex w-full items-center justify-between gap-3 text-sm font-semibold">
                <span>
                  {option.name} : <span className="font-normal text-muted">{c.selection[index]}</span>
                </span>
                {index === sizeIndex && sizeGuide && (
                  <SizeGuideButton guide={sizeGuide} highlight={c.selection[index]} className="text-muted" sheetClassName="rounded-t-2xl sm:rounded-2xl" />
                )}
              </legend>
              <div className={cn('flex flex-wrap gap-2', cards && 'grid grid-cols-2 sm:grid-cols-2')}>
                {option.values.map((value) => {
                  const selected = c.selection[index] === value;
                  const state = c.stateOf(index, value);
                  const swatch = swatchOf(option, value);
                  const delta = cards ? priceDelta(product, c.selection, index, value) : null;
                  const hint = option.type === 'condition' ? conditionHint(value) : undefined;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={swatch ? value : undefined}
                      title={state === 'unoffered' ? `${value} : sur demande` : state === 'soldout' ? `${value} : épuisé` : value}
                      onClick={() => c.select(index, value)}
                      className={cn(
                        'relative transition-colors duration-200',
                        swatch
                          ? 'size-11 rounded-full p-1'
                          : cards
                            ? 'flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border px-4 py-3 text-left'
                            : 'min-h-11 rounded-full border px-4 text-sm font-medium',
                        !swatch && (selected ? 'border-fg' : 'border-line hover:border-fg'),
                        state !== 'available' && !swatch && 'text-muted',
                        state === 'unoffered' && !swatch && 'border-dashed',
                      )}
                    >
                      {selected && !cards && (
                        <motion.span
                          layoutId={`option-${index}`}
                          aria-hidden
                          className={cn('absolute inset-0 rounded-full', swatch ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : 'bg-fg')}
                          transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
                        />
                      )}
                      {swatch ? (
                        <span
                          aria-hidden
                          className={cn('relative block size-full rounded-full ring-1 ring-fg/15', state !== 'available' && 'opacity-45')}
                          style={{ backgroundColor: swatch }}
                        />
                      ) : cards ? (
                        <>
                          <span className="font-semibold text-fg">{value}</span>
                          {hint && <span className="text-xs text-muted">{hint}</span>}
                          {delta !== null && delta !== 0 && (
                            <span className="tabular text-xs text-muted">
                              {delta > 0 ? '+' : '−'} {formatMoney(Math.abs(delta), currency)}
                            </span>
                          )}
                          {state === 'unoffered' && <span className="text-xs text-muted">Sur demande</span>}
                        </>
                      ) : (
                        <span className={cn('relative', selected && 'text-bg', state === 'soldout' && 'line-through decoration-1')}>{value}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <p className={cn('text-sm', c.status === 'available' ? 'text-muted' : 'font-semibold text-fg')}>
          {c.status === 'unoffered'
            ? 'Cette combinaison n’est pas proposée : la boutique peut vous la procurer.'
            : c.status === 'soldout'
              ? 'Épuisé pour le moment : commandez-le sur demande.'
              : stockLabel(c.available)}
        </p>

        <ServiceNotes product={product} selection={c.selection} skin={{ list: 'text-fg', button: 'rounded-lg border border-line bg-surface text-on-surface hover:border-fg/40' }} />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-line pt-5">
            <p className="text-sm font-semibold">Ajouter avec</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-line last:border-0" />
          </div>
        )}

        {c.status === 'available' ? (
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="inline-flex items-center rounded-full border border-line">
              <button
                type="button"
                aria-label="Diminuer la quantité"
                disabled={c.quantity <= 1}
                onClick={() => c.setQuantity(c.quantity - 1)}
                className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="tabular inline-flex h-11 w-8 items-center justify-center font-semibold" aria-live="polite">
                {c.quantity}
              </span>
              <button
                type="button"
                aria-label="Augmenter la quantité"
                disabled={c.quantity >= c.max}
                onClick={() => c.setQuantity(c.quantity + 1)}
                className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <motion.button
              type="button"
              onClick={c.add}
              disabled={c.pending}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-7 font-semibold text-on-primary transition-opacity disabled:opacity-50 sm:flex-none"
            >
              {c.message?.ok ? <Check className="size-5" /> : <ShoppingBag className="size-5" />}
              {c.message?.ok ? 'Ajouté' : c.pending ? 'Ajout…' : 'Ajouter au panier'}
            </motion.button>
          </div>
        ) : (
          <SpecialRequestButton
            productSlug={product.slug}
            productTitle={product.title}
            options={product.options}
            selection={c.selection}
            className="min-h-12 rounded-full bg-primary px-7 font-semibold text-on-primary"
            sheetClassName="rounded-t-2xl sm:rounded-2xl"
          />
        )}

        <div aria-live="polite" className="min-h-6 text-sm">
          {c.message && !c.message.ok && <p className="font-semibold">{c.message.text}</p>}
          {c.message?.ok && (
            <a href="/cart" className="font-semibold text-fg">
              {c.message.text} · Voir le panier →
            </a>
          )}
        </div>

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="rounded-2xl bg-soft p-4"
            buttonClassName="rounded-full bg-fg text-bg"
          />
        ))}

        {product.description && (
          <div className="flex flex-col gap-3 border-t border-line pt-6 leading-relaxed text-fg/85">
            {product.description
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        )}
        <SpecSheet kind={product.kind} attributes={product.attributes} exclude={['compatibleModels']} rowClassName="border-b border-line text-sm" />
      </div>
    </div>
  );
}
