import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { imageProps } from './media';
import { StaggerItem, StaggerList } from './motion';
import { Price } from './price';

export function ProductCard({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-3 text-fg no-underline">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-soft transition-[transform,box-shadow] duration-500 ease-out-soft group-hover:-translate-y-1 group-hover:shadow-[0_24px_40px_-24px_rgb(12_26_60/0.45)]">
        {product.image ? (
          <img
            {...imageProps(product.image, '(min-width: 1024px) 25vw, 50vw')}
            alt={product.image.alt ?? product.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-center font-heading text-lg text-muted">
            {product.title}
          </div>
        )}
        {onSale && (
          <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-on-accent shadow-sm">
            Promo
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {product.brand && (
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{product.brand.name}</span>
        )}
        <span className="leading-snug font-medium decoration-1 underline-offset-4 group-hover:underline">
          {product.title}
        </span>
        <Price
          amount={product.priceMinAmount}
          maxAmount={product.priceMaxAmount}
          compareAt={product.compareAtAmount}
          currency={currency}
          className="text-sm"
        />
      </div>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
