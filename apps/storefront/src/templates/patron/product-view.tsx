'use client';

import type { Currency, ProductOption, SizeGuide, StorefrontProductDto } from '@marche/contracts';
import { Check, Minus, Plus, Scissors } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import { AccessoryChooser, BundleOffer } from '@/components/shop/accessories';
import { SpecSheet, specRows } from '@/components/shop/spec-sheet';
import { ServiceNotes } from '@/components/shop/services';
import { SpecialRequestButton } from '@/components/shop/special-request';
import { useConfigurator } from '@/components/shop/use-configurator';
import { cn, formatMoney } from '@/lib/format';
import { type Availability, galleryFor, optionIndex, stockLabel, swatchOf } from '@/lib/product';
import { imageProps } from '../default/components/media';
import { CutFrame, Grainline, Notches, VIEW_LETTERS, ViewLetter } from './cut';

const EASE = [0.22, 1, 0.36, 1] as const;
const legend = 'font-heading text-lg leading-none font-black tracking-[0.01em] uppercase [font-stretch:112%]';

type Configurator = ReturnType<typeof useConfigurator>;

/** Une étape de la notice : grand numéro, consigne, puis le choix. */
function Step({ n, title, aside, children }: { n: number; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
      <span aria-hidden className="font-heading text-5xl leading-[0.8] font-black [font-stretch:130%] sm:text-6xl">
        {n}
      </span>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2">
          <span className={legend}>{title}</span>
          {aside}
        </legend>
        {children}
      </fieldset>
    </div>
  );
}

/**
 * Le tableau des mesures sert de sélecteur : chaque ligne est une taille, on la choisit dans le tableau
 * même. La ligne choisie est tracée au rouge ; une taille épuisée est barrée, une taille absente du modèle reste grise.
 */
function MeasureSelector({ guide, option, index, c }: { guide: SizeGuide; option: ProductOption; index: number; c: Configurator }) {
  const inGuide = new Set(guide.rows.map((cells) => cells[0]));
  const extra = option.values.filter((v) => !inGuide.has(v));
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 overflow-x-auto border-y-[1.5px] border-fg sm:mx-0">
        <table className="tabular w-full min-w-[30rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="border-b border-fg/40 px-3 py-2 font-heading text-xs font-bold tracking-[0.08em] uppercase [font-stretch:80%]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((cells) => {
              const value = cells[0]!;
              const offered = option.values.includes(value);
              const state = offered ? c.stateOf(index, value) : 'unoffered';
              const selected = c.selection[index] === value;
              return (
                <tr
                  key={value}
                  onClick={offered ? () => c.select(index, value) : undefined}
                  className={cn(
                    'border-b border-fg/15 transition-colors last:border-0',
                    offered ? 'cursor-pointer hover:bg-fg/5' : 'text-muted',
                    selected && 'bg-primary/10 outline-2 -outline-offset-2 outline-primary',
                  )}
                >
                  <th scope="row" className="px-1.5 py-1">
                    {offered ? (
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${value}${state === 'soldout' ? ', épuisé' : state === 'unoffered' ? ', sur demande' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          c.select(index, value);
                        }}
                        className={cn(
                          'inline-flex min-h-10 min-w-12 items-center justify-center px-1.5 font-heading text-base font-black [font-stretch:110%]',
                          selected && 'text-primary',
                          state === 'soldout' && 'line-through decoration-2',
                          state === 'unoffered' && 'italic',
                        )}
                      >
                        {value}
                      </button>
                    ) : (
                      <span className="inline-flex min-h-10 min-w-12 items-center justify-center px-1.5 font-heading text-base font-bold [font-stretch:110%]">
                        {value}
                      </span>
                    )}
                  </th>
                  {cells.slice(1).map((cell, i) => (
                    <td key={i} className={cn('px-3 py-1', selected && 'font-semibold')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {guide.note && <p className="text-sm text-muted">{guide.note}</p>}
      {extra.length > 0 && <Chips option={option} index={index} c={c} values={extra} />}
    </div>
  );
}

/** Valeurs simples (taille sans tableau, pointure, longueur…) : des cases imprimées, la choisie tracée au rouge. */
function Chips({ option, index, c, values = option.values }: { option: ProductOption; index: number; c: Configurator; values?: string[] }) {
  return (
    <div className="flex flex-wrap border-t-[1.5px] border-l-[1.5px] border-fg">
      {values.map((value) => {
        const selected = c.selection[index] === value;
        const state = c.stateOf(index, value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={`${value}${state === 'soldout' ? ', épuisé' : state === 'unoffered' ? ', sur demande' : ''}`}
            onClick={() => c.select(index, value)}
            className={cn(
              'relative inline-flex min-h-12 min-w-14 items-center justify-center border-r-[1.5px] border-b-[1.5px] border-fg px-3 font-heading text-base font-black [font-stretch:108%]',
              selected ? 'bg-primary text-on-primary' : 'hover:bg-fg/5',
              state === 'soldout' && 'line-through decoration-2',
              state === 'unoffered' && !selected && 'font-semibold text-muted italic',
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Fiche du modèle : à gauche la photo dans son tracé de coupe (droit-fil, crans, détail du tissu, notes épinglées),
 * à droite la notice en étapes : la vue, la taille dans le tableau des mesures, puis le coupon à découper.
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
  const [peek, setPeek] = useState<string | null>(null);
  const images = c.images;
  useEffect(() => setActive(0), [images]);
  const colorIdx = optionIndex(product, 'color');
  const peekImage =
    peek !== null && colorIdx !== -1 ? galleryFor(product, c.selection.map((v, i) => (i === colorIdx ? peek : v)))[0] : undefined;
  const main = peekImage ?? images[Math.min(active, images.length - 1)];
  const pinned = specRows(product).filter((row) => row.key === 'composition' || row.key === 'care');
  const detail = main ? (main.renditions['800'] ?? main.url) : null;
  const cut = c.pending || Boolean(c.message?.ok);

  const viewImage = (value: string) =>
    product.images.find((image) => product.imageOptionValues[image.id] === value) ?? null;

  let step = 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pt-14">
      <div className="flex flex-col gap-10 lg:sticky lg:top-28 lg:self-start">
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <CutFrame className="bg-bg">
            <div className="relative aspect-[4/5] overflow-hidden bg-surface">
              <AnimatePresence mode="wait" initial={false}>
                {main ? (
                  <motion.img
                    key={main.id}
                    {...imageProps(main, '(min-width: 1024px) 45vw, 100vw')}
                    alt={main.alt ?? product.title}
                    className="absolute inset-0 size-full object-cover"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center p-8 text-center font-heading text-4xl font-black uppercase [font-stretch:115%]">
                    {product.title}
                  </div>
                )}
              </AnimatePresence>
              {pinned.length > 0 && (
                <ul className="absolute top-4 right-4 flex max-w-[60%] flex-col items-end gap-2">
                  {pinned.map((row, i) => (
                    <li
                      key={row.key}
                      className={cn(
                        'relative bg-surface px-3 pt-3 pb-2 text-sm leading-snug text-accent shadow-[0_6px_14px_-8px_rgb(0_0_0/0.45)]',
                        i % 2 ? '-rotate-1' : 'rotate-1',
                      )}
                    >
                      <span aria-hidden className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-fg shadow-[0_1px_2px_rgb(0_0_0/0.4)]" />
                      <span className="font-semibold">{row.label} :</span> {row.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Notches className="absolute -bottom-[0.55rem] left-1/3 bg-bg" />
            <Notches className="absolute -bottom-[0.55rem] left-2/3 bg-bg" />
            {detail && (
              <div aria-hidden className="absolute -bottom-9 left-5 hidden flex-col items-start gap-1 sm:flex">
                <span className="size-28 border-[1.5px] border-dashed border-fg bg-surface p-1">
                  <span
                    className="block size-full bg-no-repeat"
                    style={{ backgroundImage: `url(${detail})`, backgroundSize: '340%', backgroundPosition: '50% 42%' }}
                  />
                </span>
              </div>
            )}
          </CutFrame>
          <div className="flex flex-col items-center gap-2 py-6">
            <Grainline className="flex-1" />
            <span className="font-heading text-[0.625rem] font-bold tracking-[0.16em] uppercase [writing-mode:vertical-rl] [font-stretch:75%]">
              Droit fil
            </span>
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex flex-wrap gap-3 sm:pl-36">
            {images.slice(0, 8).map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={image.id === main?.id}
                className={cn('size-16 border-[1.5px] bg-surface p-0.5', image.id === main?.id ? 'border-primary' : 'border-fg/40 hover:border-fg')}
              >
                <img {...imageProps(image, '64px')} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 border-b-[5px] border-double border-fg pb-5">
          {product.brand && <span className="text-sm font-semibold">{product.brand.name}</span>}
          <h1 className="font-heading text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.88] font-black tracking-[-0.03em] text-balance uppercase [font-stretch:122%]">
            {product.title}
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            {c.variant ? (
              <span className="tabular font-heading text-3xl font-black [font-stretch:110%]">{formatMoney(c.variant.priceAmount, currency)}</span>
            ) : (
              <span className="font-heading text-2xl font-black uppercase [font-stretch:110%]">Sur demande</span>
            )}
            {c.variant?.compareAtAmount != null && c.variant.compareAtAmount > c.variant.priceAmount && (
              <s className="tabular text-lg text-muted">
                <span className="sr-only">au lieu de </span>
                {formatMoney(c.variant.compareAtAmount, currency)}
              </s>
            )}
            {c.variant?.sku && <span className="tabular text-sm text-muted">Réf. {c.variant.sku}</span>}
          </div>
        </div>

        {product.options.map((option, index) => {
          step += 1;
          if (option.type === 'color') {
            return (
              <Step key={option.name} n={step} title="Choisissez la vue" aside={<span className="text-base font-semibold">{c.selection[index]}</span>}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" onMouseLeave={() => setPeek(null)}>
                  {option.values.map((value, i) => {
                    const selected = c.selection[index] === value;
                    const state = c.stateOf(index, value);
                    const swatch = swatchOf(option, value);
                    const thumb = viewImage(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Vue ${VIEW_LETTERS[i]}, ${value}${state === 'soldout' ? ', épuisé' : state === 'unoffered' ? ', sur demande' : ''}`}
                        onClick={() => c.select(index, value)}
                        onMouseEnter={() => setPeek(value)}
                        onFocus={() => setPeek(value)}
                        onBlur={() => setPeek(null)}
                        className={cn(
                          'flex items-center gap-3 border-[1.5px] p-1.5 pr-3 text-left transition-colors',
                          selected ? 'border-primary bg-primary/10' : 'border-fg/40 hover:border-fg',
                        )}
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden bg-surface">
                          {thumb ? (
                            <img {...imageProps(thumb, '56px')} alt="" loading="lazy" className="size-full object-cover" />
                          ) : (
                            <span className="block size-full" style={{ backgroundColor: swatch ?? undefined }} />
                          )}
                          {swatch && thumb && (
                            <span className="absolute right-1 bottom-1 size-3.5 rounded-full border border-fg/40" style={{ backgroundColor: swatch }} />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <ViewLetter letter={VIEW_LETTERS[i]!} active={selected} className="size-6 text-xs" />
                          <span className={cn('truncate text-sm font-semibold', state === 'soldout' && 'line-through', state === 'unoffered' && 'text-muted italic')}>
                            {value}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Step>
            );
          }
          const isSize = option.type === 'size' || option.type === 'shoe_size';
          return (
            <Step
              key={option.name}
              n={step}
              title={isSize ? 'Trouvez votre taille' : `Choisissez ${option.name.toLowerCase()}`}
              aside={<span className="text-base font-semibold">{c.selection[index]}</span>}
            >
              {isSize && sizeGuide ? <MeasureSelector guide={sizeGuide} option={option} index={index} c={c} /> : <Chips option={option} index={index} c={c} />}
            </Step>
          );
        })}

        <Step n={step + 1} title={c.status === 'available' ? 'Découpez le coupon' : 'Demandez ce modèle'}>
          <p className="-mt-1 flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className={cn('size-2.5', c.status === 'available' ? 'bg-fg' : 'border-[1.5px] border-fg')} />
            {c.status === 'unoffered'
              ? 'Cette combinaison n’est pas au catalogue : la maison peut la faire à la demande.'
              : c.status === 'soldout'
                ? 'Épuisé pour le moment : demandez-le.'
                : stockLabel(c.available)}
          </p>
          {c.status === 'available' ? (
            <div className="flex flex-wrap items-stretch gap-4 pt-2">
              <div className="inline-flex items-center border-[1.5px] border-fg">
                <button type="button" aria-label="Diminuer la quantité" disabled={c.quantity <= 1} onClick={() => c.setQuantity(c.quantity - 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                  <Minus className="size-4" strokeWidth={2.2} />
                </button>
                <span className="tabular inline-flex h-12 w-9 items-center justify-center border-x-[1.5px] border-fg font-heading text-lg font-black" aria-live="polite">
                  {c.quantity}
                </span>
                <button type="button" aria-label="Augmenter la quantité" disabled={c.quantity >= c.max} onClick={() => c.setQuantity(c.quantity + 1)} className="flex size-12 items-center justify-center disabled:opacity-40">
                  <Plus className="size-4" strokeWidth={2.2} />
                </button>
              </div>
              <motion.div
                className="relative min-w-[15rem] flex-1 border-[1.5px] border-dashed border-fg p-1.5"
                animate={c.message?.ok && !reduce ? { rotate: -1.5, y: 4 } : { rotate: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              >
                <motion.span
                  aria-hidden
                  className="absolute -top-[0.7rem] z-10 bg-bg px-0.5"
                  initial={false}
                  animate={{ left: cut ? 'calc(100% - 2rem)' : '0.75rem' }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
                >
                  <Scissors className="size-5" strokeWidth={1.8} />
                </motion.span>
                <button
                  type="button"
                  onClick={c.add}
                  disabled={c.pending}
                  className="flex min-h-14 w-full items-center justify-center gap-3 bg-fg px-6 font-heading text-base font-bold tracking-[0.08em] text-bg uppercase [font-stretch:82%] disabled:opacity-80"
                >
                  {c.message?.ok && <Check className="size-5" strokeWidth={2.4} aria-hidden />}
                  {c.message?.ok ? c.message.text : c.pending ? 'On découpe…' : 'Ajouter au panier'}
                </button>
              </motion.div>
            </div>
          ) : (
            <SpecialRequestButton
              productSlug={product.slug}
              productTitle={product.title}
              options={product.options}
              selection={c.selection}
              label="Demander ce modèle"
              className="inline-flex min-h-14 items-center justify-center gap-3 self-start border-[1.5px] border-fg bg-fg px-7 font-heading font-bold tracking-[0.08em] text-bg uppercase [font-stretch:82%]"
              sheetClassName="bg-bg text-fg"
            />
          )}
          <div aria-live="polite" className="min-h-6 text-sm font-semibold">
            {c.message && !c.message.ok && <p>{c.message.text}</p>}
            {c.message?.ok && (
              <a href="/cart" className="text-fg underline decoration-primary decoration-2 underline-offset-4">
                Voir le panier →
              </a>
            )}
          </div>
        </Step>

        <ServiceNotes product={product} selection={c.selection} skin={{ item: 'border-t border-fg/20 pt-3', button: 'border-[1.5px] border-dashed border-fg font-heading tracking-[0.08em] uppercase [font-stretch:82%]', sheet: 'bg-bg text-fg' }} />

        {product.accessories.length > 0 && (
          <div className="flex flex-col gap-2 border-y-[1.5px] border-fg py-4">
            <p className={legend}>À assortir</p>
            <AccessoryChooser accessories={product.accessories} currency={currency} configurator={c} itemClassName="border-b border-dashed border-fg/30 last:border-0" />
          </div>
        )}

        {product.bundles.map((bundle) => (
          <BundleOffer
            key={bundle.id}
            bundle={bundle}
            currency={currency}
            configurator={c}
            className="border-[1.5px] border-dashed border-fg bg-surface p-5 text-on-surface"
            buttonClassName="bg-fg text-bg font-heading uppercase tracking-[0.08em] [font-stretch:82%]"
          />
        ))}

        {(product.description || specRows(product).length > 0) && (
          <section aria-labelledby="notice" className="flex flex-col gap-4 border-t-[5px] border-double border-fg pt-6">
            <h2 id="notice" className="font-heading text-2xl leading-none font-black uppercase [font-stretch:118%]">
              Notice
            </h2>
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
            <SpecSheet product={product} className="border-y-[1.5px] border-fg" rowClassName="border-b border-fg/15 last:border-0 text-sm" />
          </section>
        )}
      </div>
    </div>
  );
}
