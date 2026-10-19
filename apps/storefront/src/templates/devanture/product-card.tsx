import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { StaggerItem, StaggerList } from '../default/components/motion';

/** Un article dans son cadre peint, le prix sur une plaque clouée au coin. */
export function ProductCard({ product, currency, priority }: { product: StorefrontProductCardDto; currency: Currency; priority?: boolean }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group relative flex flex-col text-on-surface no-underline">
      <div className="painted-frame flex flex-col gap-4 bg-surface p-3.5 pb-5 transition-transform duration-300 ease-out-soft group-hover:-translate-y-1">
        <div className="relative aspect-[4/5] overflow-hidden border-2 border-line bg-bg">
          {product.image ? (
            <img
              {...imageProps(product.image, '(min-width: 1024px) 25vw, 50vw')}
              alt={product.image.alt ?? product.title}
              loading={priority ? 'eager' : 'lazy'}
              className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-4 text-center font-heading text-2xl text-fg uppercase">{product.title}</div>
          )}
        </div>
        {/* Taille fixe : marque et pastilles gardent leur place même vides, titre sur deux lignes réservées. */}
        <div className="flex flex-col gap-1.5 px-1">
          <span className="truncate text-xs font-bold tracking-[0.12em] text-on-surface/75 uppercase">{product.brand?.name ?? ' '}</span>
          <span className="line-clamp-2 min-h-[2lh] font-heading text-lg leading-tight uppercase decoration-2 underline-offset-4 group-hover:underline">
            {product.title}
          </span>
          <span
            className="flex h-[1.125rem] gap-1.5 pt-1"
            aria-label={product.swatches.length > 1 ? `${product.swatches.length} couleurs` : undefined}
            aria-hidden={product.swatches.length > 1 ? undefined : true}
          >
            {product.swatches.length > 1 &&
              product.swatches.slice(0, 5).map((s) => (
                <span key={s.value} title={s.value} className="size-3.5 rounded-full border-2 border-line" style={{ backgroundColor: s.hex }} />
              ))}
          </span>
        </div>
      </div>
      <span className="tabular absolute top-7 -right-2 flex rotate-[4deg] flex-col items-end border-2 border-line bg-primary px-3 py-1.5 text-on-primary shadow-[3px_3px_0_var(--color-line)] transition-transform duration-300 ease-out-soft group-hover:rotate-0">
        {onSale && (
          <s className="text-xs opacity-80">
            <span className="sr-only">au lieu de </span>
            {formatMoney(product.compareAtAmount!, currency)}
          </s>
        )}
        <span className="font-heading text-lg leading-none">
          {product.priceMinAmount !== product.priceMaxAmount && <span className="mr-1 font-body text-xs font-bold normal-case">dès</span>}
          {formatMoney(product.priceMinAmount, currency)}
        </span>
      </span>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
