import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { StaggerItem, StaggerList } from '../default/components/motion';
import { PriceTag } from './tag';

/** Un appareil posé sur la tablette de verre, son étiquette pendue au bord. */
export function ProductCard({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-5 text-fg no-underline">
      <div className="glass-shelf relative flex aspect-square items-end justify-center px-4 pb-3">
        <span aria-hidden className="stand-shadow absolute bottom-2 left-1/2 h-4 w-3/5 -translate-x-1/2" />
        {product.image ? (
          <img
            {...imageProps(product.image, '(min-width: 1024px) 25vw, 50vw')}
            alt={product.image.alt ?? product.title}
            loading="lazy"
            className="relative max-h-full w-auto max-w-full object-contain transition-transform duration-500 ease-out-soft group-hover:-translate-y-2"
          />
        ) : (
          <div className="relative flex size-full items-center justify-center text-center font-heading text-2xl text-muted uppercase">
            {product.title}
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-3">
        <PriceTag size="sm" className="-mt-1 -rotate-3 transition-transform duration-300 ease-out-soft group-hover:rotate-2">
          {product.priceMinAmount !== product.priceMaxAmount && <span className="mr-1 text-xs font-bold normal-case">dès</span>}
          {formatMoney(product.priceMinAmount, currency)}
        </PriceTag>
        <span className="font-heading text-lg leading-tight font-bold tracking-wide uppercase decoration-primary decoration-2 underline-offset-4 group-hover:underline">
          {product.title}
        </span>
        <span className="flex items-center gap-3 text-sm text-muted">
          {product.brand && <span>{product.brand.name}</span>}
          {onSale && (
            <s className="tabular">
              <span className="sr-only">au lieu de </span>
              {formatMoney(product.compareAtAmount!, currency)}
            </s>
          )}
          {product.swatches.length > 1 && (
            <span className="flex gap-1" aria-label={`${product.swatches.length} couleurs`}>
              {product.swatches.slice(0, 5).map((s) => (
                <span key={s.value} title={s.value} className="size-3 rounded-full ring-1 ring-fg/30" style={{ backgroundColor: s.hex }} />
              ))}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-6 gap-y-14 sm:gap-x-10 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
