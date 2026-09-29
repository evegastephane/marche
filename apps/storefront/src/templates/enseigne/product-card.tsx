import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { cn, formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { SegmentPrice } from './segments';

function Photo({ product, sizes, className }: { product: StorefrontProductCardDto; sizes: string; className?: string }) {
  return product.image ? (
    <img
      {...imageProps(product.image, sizes)}
      alt={product.image.alt ?? product.title}
      loading="lazy"
      // Les photos sur fond blanc se fondent dans la lumière de l'étal.
      className={cn('size-full object-contain mix-blend-multiply', className)}
    />
  ) : (
    <span className={cn('flex size-full items-center justify-center p-2 text-center text-sm font-bold', className)}>{product.title}</span>
  );
}

/** Un appareil sur l'étal éclairé, et sous lui son nom et son prix allumé. */
export function ProductTile({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-4 text-fg no-underline">
      <span className="lit-shelf relative block aspect-square rounded-md p-5 transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 sm:p-7">
        <Photo product={product} sizes="(min-width: 1024px) 22vw, 45vw" />
      </span>
      <span className="flex flex-col gap-2">
        <span className="text-[1.0625rem] leading-snug font-bold text-balance group-hover:underline">{product.title}</span>
        {product.brand && <span className="-mt-1 text-sm text-muted">{product.brand.name}</span>}
        <span className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <SegmentPrice
            amount={product.priceMinAmount}
            currency={currency}
            from={product.priceMinAmount !== product.priceMaxAmount}
            className="led-glow text-[1.875rem]"
          />
          {onSale && (
            <s className="tabular text-sm text-muted">
              <span className="sr-only">au lieu de </span>
              {formatMoney(product.compareAtAmount!, currency)}
            </s>
          )}
        </span>
        {product.swatches.length > 1 && (
          <span className="flex gap-1.5" aria-label={`${product.swatches.length} coloris`}>
            {product.swatches.slice(0, 6).map((s) => (
              <span key={s.value} title={s.value} className="size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]" style={{ backgroundColor: s.hex }} />
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}

export function TileGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} currency={currency} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Le tableau des prix, comme au-dessus du comptoir : un modèle par ligne, sa photo sur un petit étal,
 * son prix allumé à droite. Se lit d'un coup d'œil pour comparer.
 */
export function PriceBoard({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <ul className="led-board overflow-hidden rounded-md border border-line">
      {products.map((product) => {
        const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
        return (
          <li key={product.id} className="border-b border-line last:border-0">
            <Link
              href={`/products/${product.slug}`}
              className="group grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-3 py-3 text-fg no-underline transition-colors hover:bg-[color-mix(in_oklab,var(--color-primary)_9%,transparent)] sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:px-5"
            >
              <span className="lit-shelf row-span-2 block size-14 rounded-[4px] p-1.5 sm:row-span-1 sm:size-16">
                <Photo product={product} sizes="64px" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[1.0625rem] font-bold group-hover:underline">{product.title}</span>
                <span className="truncate text-sm text-muted">
                  {product.brand?.name}
                  {product.brand && product.swatches.length > 1 && ' · '}
                  {product.swatches.length > 1 && `${product.swatches.length} coloris`}
                </span>
              </span>
              <span className="flex items-end gap-3 sm:justify-end">
                {onSale && (
                  <s className="tabular text-sm text-muted">
                    <span className="sr-only">au lieu de </span>
                    {formatMoney(product.compareAtAmount!, currency)}
                  </s>
                )}
                <SegmentPrice
                  amount={product.priceMinAmount}
                  currency={currency}
                  from={product.priceMinAmount !== product.priceMaxAmount}
                  className="led-glow text-[1.75rem] sm:text-[2.125rem]"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
