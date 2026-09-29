import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { StaggerItem, StaggerList } from '../default/components/motion';
import { BoxFront } from './box';

/** Une boîte en rayon, et sous elle son étiquette : prix dans la couleur d'action, coloris en pastilles. */
export function ProductCard({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-4 pt-2.5 pr-2.5 text-fg no-underline">
      <BoxFront
        image={product.image}
        title={product.title}
        brand={product.brand?.name ?? null}
        sizes="(min-width: 1024px) 22vw, 45vw"
        className="aspect-[4/5] p-4 [--box-depth:10px] transition-transform duration-500 ease-out-soft group-hover:-translate-y-1 sm:p-5"
      />
      <div className="flex flex-col gap-1.5 border border-line bg-surface px-3 py-2.5 font-hand text-xs text-on-surface">
        <span className="flex items-baseline justify-between gap-2">
          <span className="tracking-[0.12em] uppercase">Prix</span>
          <span className="tabular text-sm font-semibold text-primary">
            {product.priceMinAmount !== product.priceMaxAmount && <span className="mr-1 font-normal">dès</span>}
            {formatMoney(product.priceMinAmount, currency)}
          </span>
        </span>
        {onSale && (
          <span className="flex justify-end">
            <s className="tabular opacity-70">
              <span className="sr-only">au lieu de </span>
              {formatMoney(product.compareAtAmount!, currency)}
            </s>
          </span>
        )}
        {product.swatches.length > 1 && (
          <span className="flex items-center justify-between gap-2">
            <span className="tracking-[0.12em] uppercase">Coloris</span>
            <span className="flex gap-1" aria-label={`${product.swatches.length} coloris`}>
              {product.swatches.slice(0, 5).map((s) => (
                <span key={s.value} title={s.value} className="size-3 border border-on-surface/40" style={{ backgroundColor: s.hex }} />
              ))}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
