'use client';

import type { Currency, ProductOption, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { ServiceNotes } from '@/components/shop/services';
import { SizeGuideButton } from '@/components/shop/size-guide';
import { SpecSheet } from '@/components/shop/spec-sheet';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { type Configurator, useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';

const EASE = [0.16, 1, 0.3, 1] as const;
const legend = 'font-heading text-[1.375rem] leading-none font-black tracking-[0.01em] uppercase';

/**
 * Une valeur d'option comme un caractère imprimé : la choisie s'imprime dans la couleur d'action,
 * les autres gardent leur seul contour, une valeur épuisée reste dessinée en fantôme.
 */
function OptionValues({ option, index, c, square }: { option: ProductOption; index: number; c: Configurator; square: boolean }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {option.values.map((value) => {
        const selected = c.selection[index] === value;
        const state = c.stateOf(index, value);
        const swatch = option.type === 'color' ? swatchOf(option, value) : null;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={`${value}${state === 'soldout' ? ', épuisé' : state === 'unoffered' ? ', sur demande' : ''}`}
            onClick={() => c.select(index, value)}
            className={cn(
              'inline-flex min-h-13 items-center justify-center gap-2.5 border-2 font-heading leading-none font-black uppercase transition-colors duration-150',
              square ? 'min-w-14 px-3 text-[1.375rem]' : 'px-4 text-[1.125rem] tracking-[0.02em]',
              selected
                ? 'print-in border-primary bg-primary text-on-primary'
                : state === 'soldout'
                  ? 'border-dashed border-fg/35 text-fg/40 line-through decoration-2'
                  : state === 'unoffered'
                    ? 'border-dashed border-fg/60 text-fg/75 italic hover:border-fg'
                    : 'border-fg text-fg hover:bg-fg/5',
            )}
          >
            {swatch && (
              <span
                aria-hidden
                className={cn('size-5 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_rgb(0_0_0/0.2)]', state === 'soldout' && !selected && 'opacity-40')}
                style={{ backgroundColor: swatch }}
              />
            )}
            {value}
          </button>
        );
      })}
    </div>
  );
}

/**
 * La page mode : à gauche la photo en pleine page, la reliure en trait épais ;
 * à droite le titre, le chapô, le prix, puis les choix et la commande.
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
  const [active, setActive] = useState(0);
  const images = c.images;
  useEffect(() => setActive(0), [images]);
  const main = images[Math.min(active, images.length - 1)] ?? null;
  const paragraphs = (product.description ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [standfirst, ...body] = paragraphs;
  const sizeIndex = product.options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const hasSheet = Object.keys(product.attributes).length > 0;

  return (
    <article className="mx-auto grid max-w-[88rem] gap-10 px-4 pt-8 sm:px-8 lg:grid-cols-2 lg:gap-0 lg:pt-12">
      <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start lg:border-r-[3px] lg:border-fg lg:pr-10">
        <figure className="relative m-0 aspect-[4/5] overflow-hidden bg-soft">
          <AnimatePresence mode="wait" initial={false}>
            {main ? (
              <motion.img
                key={main.id}
                {...imageProps(main, '(min-width: 1024px) 44vw, 100vw')}
                alt={main.alt ?? product.title}
                className="absolute inset-0 size-full object-cover"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
              />
            ) : (
              <span className="absolute inset-0 flex items-end p-6 font-heading text-6xl leading-[0.84] font-black uppercase">{product.title}</span>
            )}
          </AnimatePresence>
        </figure>
        {images.length > 1 && (
          <div className="flex flex-wrap gap-2.5">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn('h-20 w-16 overflow-hidden bg-soft', image.id === main?.id ? 'outline-[3px] outline-offset-2 outline-primary' : 'opacity-75 hover:opacity-100')}
              >
                <img {...imageProps(image, '64px')} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-10 lg:pl-12">
        <header className="flex flex-col gap-5">
          <h1 className="font-heading text-[clamp(2.75rem,6vw,5.75rem)] leading-[0.84] font-black tracking-[-0.015em] text-balance uppercase [font-variation-settings:'opsz'_72]">
            {product.title}
          </h1>
          {standfirst && <p className="max-w-[46ch] text-xl leading-snug font-medium">{standfirst}</p>}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {c.variant ? (
              <span className="tabular font-heading text-[2.75rem] leading-none font-black">{formatMoney(c.variant.priceAmount, currency)}</span>
            ) : (
              <span className="font-heading text-3xl leading-none font-black uppercase">Sur demande</span>
            )}
            {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
              <s className="tabular text-xl text-muted">
                <span className="sr-only">au lieu de </span>
                {formatMoney(c.variant.compareAtAmount, currency)}
              </s>
            )}
          </div>
          {(product.brand || c.variant?.sku) && (
            <p className="text-sm text-muted">
              {product.brand?.name}
              {product.brand && c.variant?.sku && ' · '}
              {c.variant?.sku && <span className="tabular">Réf. {c.variant.sku}</span>}
            </p>
          )}
        </header>

        {product.options.map((option, index) => {
          const isSize = option.type === 'size' || option.type === 'shoe_size';
          return (
            <fieldset key={option.name} className="flex min-w-0 flex-col gap-4 border-t-[3px] border-fg pt-5">
              <legend className="sr-only">{option.name}</legend>
              <div aria-hidden className="flex flex-wrap items-baseline justify-between gap-3">
                <span className={legend}>
                  {option.name}
                  <span className="ml-3 font-body text-base font-semibold tracking-normal normal-case">{c.selection[index]}</span>
                </span>
              </div>
              <OptionValues option={option} index={index} c={c} square={isSize} />
              {index === sizeIndex && sizeGuide && (
                <SizeGuideButton
                  guide={sizeGuide}
                  highlight={c.selection[index]}
                  className="self-start text-sm font-semibold underline decoration-2 underline-offset-4"
                  sheetClassName="bg-bg text-fg"
                >
                  Guide des tailles
                </SizeGuideButton>
              )}
            </fieldset>
          );
        })}

        <div className="flex flex-col gap-4 border-t-[3px] border-fg pt-5">
          <p className="flex items-center gap-2.5 text-[0.9375rem] font-semibold">
            <span aria-hidden className={cn('size-3 rounded-full', c.status === 'available' ? 'bg-primary' : 'border-2 border-dashed border-fg/60')} />
            {c.status === 'unoffered'
              ? 'Cette combinaison n’est pas au catalogue : la boutique peut la faire à la demande.'
              : c.status === 'soldout'
                ? 'Épuisé pour le moment : demandez-le.'
                : stockLabel(c.available)}
          </p>
          {c.status === 'available' ? (
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="inline-flex items-center border-2 border-fg">
                <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-14 items-center justify-center disabled:opacity-35">
                  <Minus className="size-4" strokeWidth={2.4} />
                </button>
                <span className="tabular inline-flex h-14 w-9 items-center justify-center font-heading text-2xl font-black" aria-live="polite">
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
                className="inline-flex min-h-14 min-w-[14rem] flex-1 items-center justify-center bg-primary px-8 font-heading text-[1.375rem] font-black tracking-[0.02em] text-on-primary uppercase disabled:opacity-75"
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
              label="Demander cette pièce"
              className="inline-flex min-h-14 items-center justify-center self-start bg-primary px-8 font-heading text-[1.25rem] font-black tracking-[0.02em] text-on-primary uppercase"
              sheetClassName="bg-bg text-fg"
            />
          )}
          <div aria-live="polite" className="min-h-6 text-[0.9375rem] font-semibold">
            {c.message && !c.message.ok && <p>{c.message.text}</p>}
            {c.message?.ok && (
              <a href="/cart" className="text-fg underline decoration-primary decoration-[3px] underline-offset-4">
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
            button: 'border-2 border-fg font-heading text-lg font-black uppercase tracking-[0.02em] hover:bg-fg hover:text-bg',
            sheet: 'bg-bg text-fg',
          }}
        />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-2 border-t-[3px] border-fg pt-5">
            <p className={legend}>À porter avec</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-line last:border-0" />
          </div>
        )}

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="bg-surface p-6 text-on-surface"
            buttonClassName="bg-primary text-on-primary font-heading text-lg font-black uppercase tracking-[0.02em]"
          />
        ))}

        {(body.length > 0 || hasSheet) && (
          <section aria-labelledby="article" className="flex flex-col gap-6 border-t-[3px] border-fg pt-5">
            <h2 id="article" className={legend}>
              L’article
            </h2>
            {body.length > 0 && (
              <div className="flex flex-col gap-4 text-lg leading-relaxed">
                {body.map((p, i) => (
                  <p key={i} className="max-w-[62ch]">
                    {p}
                  </p>
                ))}
              </div>
            )}
            {hasSheet && (
              <div className="bg-surface p-6 text-on-surface sm:p-7">
                <SpecSheet kind={product.kind} attributes={product.attributes} className="text-[0.9375rem]" rowClassName="border-b border-on-surface/20 py-2 last:border-0" />
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  );
}
