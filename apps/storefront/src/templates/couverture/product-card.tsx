import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { cn, formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';

/**
 * Une page mode : la photo sans cadre, puis sa ligne de crédits comme dans un magazine
 * (le nom de la pièce en capitales, la marque, le prix). `spread` : la pièce ouvre la double page.
 */
export function PageCard({
  product,
  currency,
  spread = false,
  sizes,
}: {
  product: StorefrontProductCardDto;
  currency: Currency;
  spread?: boolean;
  sizes?: string;
}) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-3 text-current no-underline">
      <span className="relative block aspect-[4/5] overflow-hidden bg-[color-mix(in_oklab,currentColor_7%,transparent)]">
        {product.image ? (
          <img
            {...imageProps(product.image, sizes ?? (spread ? '(min-width: 1024px) 46vw, 100vw' : '(min-width: 1024px) 22vw, 50vw'))}
            alt={product.image.alt ?? product.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-end p-4 font-heading text-3xl leading-[0.85] font-black uppercase">{product.title}</span>
        )}
      </span>
      <span className="flex flex-col gap-1.5">
        <span
          className={cn(
            'font-heading leading-[0.9] font-black text-balance uppercase decoration-[3px] underline-offset-[0.14em] group-hover:underline',
            spread ? 'text-[clamp(1.75rem,3vw,2.75rem)]' : 'text-[1.4rem] sm:text-[1.55rem]',
          )}
        >
          {product.title}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.9375rem]">
          {product.brand && <span className="opacity-80">{product.brand.name}</span>}
          <span className="tabular font-semibold">
            {product.priceMinAmount !== product.priceMaxAmount && 'dès '}
            {formatMoney(product.priceMinAmount, currency)}
          </span>
          {onSale && (
            <s className="tabular opacity-70">
              <span className="sr-only">au lieu de </span>
              {formatMoney(product.compareAtAmount!, currency)}
            </s>
          )}
        </span>
        {product.swatches.length > 1 && (
          <span className="flex gap-1.5 pt-0.5" aria-label={`${product.swatches.length} coloris`}>
            {product.swatches.slice(0, 6).map((s) => (
              <span key={s.value} title={s.value} className="size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)]" style={{ backgroundColor: s.hex }} />
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Les pages mode : une grille qui s'ouvre, si `feature`, sur une pièce en double page. */
export function PagesGrid({ products, currency, feature = false }: { products: StorefrontProductCardDto[]; currency: Currency; feature?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 lg:grid-cols-4 lg:gap-y-16">
      {products.map((product, i) => {
        const spread = feature && i === 0 && products.length > 2;
        return (
          <li key={product.id} className={cn(spread && 'col-span-2 self-start lg:row-span-2')}>
            <PageCard product={product} currency={currency} spread={spread} />
          </li>
        );
      })}
    </ul>
  );
}
