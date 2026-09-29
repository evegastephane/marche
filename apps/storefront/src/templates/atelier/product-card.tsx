import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { cn, formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { StaggerItem, StaggerList } from '../default/components/motion';

/** Inclinaisons des photos collées : jamais deux voisines pareilles, jamais plus de 2°. */
const TILTS = ['-rotate-[1.4deg]', 'rotate-[0.9deg]', '-rotate-[0.6deg]', 'rotate-[1.6deg]'];

/** Fiche du cahier : photo collée d'une bande d'adhésif, nom imprimé, prix écrit au stylo. */
export function ProductCard({ product, currency, index = 0 }: { product: StorefrontProductCardDto; currency: Currency; index?: number }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-4 text-fg no-underline">
      <div
        className={cn(
          'relative bg-surface p-2 pb-3 shadow-[0_1px_1px_rgb(0_0_0/0.06),0_8px_18px_-10px_rgb(0_0_0/0.35)] transition-transform duration-500 ease-out-soft group-hover:rotate-0 group-hover:-translate-y-1',
          TILTS[index % TILTS.length],
        )}
      >
        <span aria-hidden className="tape top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-3" />
        <div className="aspect-[4/5] overflow-hidden bg-bg">
          {product.image ? (
            <img
              {...imageProps(product.image, '(min-width: 1024px) 25vw, 50vw')}
              alt={product.image.alt ?? product.title}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-4 text-center font-hand text-xl text-muted">{product.title}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-heading leading-snug font-semibold decoration-accent decoration-2 underline-offset-4 group-hover:underline">
          {product.title}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 font-hand text-xl leading-tight font-bold text-accent">
          {product.priceMinAmount !== product.priceMaxAmount && <span className="text-base font-normal">dès</span>}
          {formatMoney(product.priceMinAmount, currency)}
          {onSale && (
            <s className="text-base font-normal text-muted">
              <span className="sr-only">au lieu de </span>
              {formatMoney(product.compareAtAmount!, currency)}
            </s>
          )}
        </span>
        {product.swatches.length > 1 && (
          <span className="flex gap-1.5 pt-1" aria-label={`${product.swatches.length} couleurs`}>
            {product.swatches.slice(0, 6).map((s) => (
              <span key={s.value} title={s.value} className="size-3.5 rounded-full ring-1 ring-fg/25" style={{ backgroundColor: s.hex }} />
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-10 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} index={index} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
