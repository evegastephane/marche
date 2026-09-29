import type { Currency, StorefrontProductCardDto } from '@marche/contracts';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { imageProps } from '../default/components/media';
import { StaggerItem, StaggerList } from '../default/components/motion';
import { CutFrame, VIEW_LETTERS } from './cut';

/** Un modèle sous enveloppe : la photo dans son tracé de coupe, le nom en grande grotesque, ses vues lettrées. */
export function ProductCard({ product, currency }: { product: StorefrontProductCardDto; currency: Currency }) {
  const onSale = product.compareAtAmount != null && product.compareAtAmount > product.priceMinAmount;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col text-on-surface no-underline">
      <div className="flex flex-col gap-4 border-[1.5px] border-fg bg-surface p-3 pt-4 transition-transform duration-300 ease-out-soft group-hover:-translate-y-1">
        <CutFrame className="border-fg/60 [&>svg]:bg-surface">
          <div className="aspect-[4/5] overflow-hidden bg-bg">
            {product.image ? (
              <img
                {...imageProps(product.image, '(min-width: 1024px) 25vw, 50vw')}
                alt={product.image.alt ?? product.title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex size-full items-center justify-center p-4 text-center font-heading text-xl font-black text-fg uppercase [font-stretch:110%]">
                {product.title}
              </div>
            )}
          </div>
        </CutFrame>
        <div className="flex flex-col gap-2 px-0.5">
          <span className="font-heading text-lg leading-[0.95] font-black tracking-[-0.01em] uppercase [font-stretch:112%] decoration-2 underline-offset-4 group-hover:underline">
            {product.title}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular font-heading text-base font-bold">
              {product.priceMinAmount !== product.priceMaxAmount && <span className="mr-1 font-body text-xs font-semibold">dès</span>}
              {formatMoney(product.priceMinAmount, currency)}
            </span>
            {onSale && (
              <s className="tabular text-sm text-on-surface/70">
                <span className="sr-only">au lieu de </span>
                {formatMoney(product.compareAtAmount!, currency)}
              </s>
            )}
          </span>
          {product.swatches.length > 1 && (
            <span className="flex flex-wrap gap-x-3 gap-y-1" aria-label={`${product.swatches.length} coloris`}>
              {product.swatches.slice(0, 6).map((s, i) => (
                <span key={s.value} title={s.value} className="inline-flex items-center gap-1 text-xs font-bold">
                  <span aria-hidden className="size-3 rounded-full border border-fg/40" style={{ backgroundColor: s.hex }} />
                  <span aria-hidden>{VIEW_LETTERS[i]}</span>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, currency }: { products: StorefrontProductCardDto[]; currency: Currency }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
