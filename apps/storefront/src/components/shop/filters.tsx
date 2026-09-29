import { CURRENCY_EXPONENT, type Currency, type StorefrontFacetsDto, type StorefrontSort } from '@marche/contracts';
import { Check, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { activeFilterCount, type CatalogParams, catalogHref, toggle } from '@/lib/catalog-query';
import { cn } from '@/lib/format';

const SORT_LABELS: Record<StorefrontSort, string> = {
  featured: 'Sélection',
  newest: 'Nouveautés',
  'price-asc': 'Prix croissant',
  'price-desc': 'Prix décroissant',
};

export interface FilterSkin {
  /** Libellé d'un groupe (Taille, Couleur…). */
  legend?: string;
  /** Une valeur ; `active` s'ajoute quand elle est choisie. */
  chip?: string;
  active?: string;
  /** Mise en page des groupes (grille sur grand écran…). */
  body?: string;
}

/**
 * Filtres d'un catalogue, rendus côté serveur en liens (ils marchent sans JavaScript et se partagent).
 * Au téléphone, ils se replient sous « Filtrer ». Chaque template les habille par un « skin ».
 */
export function CatalogFilters({
  base,
  params,
  facets,
  currency,
  skin = {},
  className,
}: {
  base: string;
  params: CatalogParams;
  facets: StorefrontFacetsDto;
  currency: Currency;
  skin?: FilterSkin;
  className?: string;
}) {
  const count = activeFilterCount(params);
  const chip = (active: boolean) =>
    cn(
      'inline-flex min-h-10 items-center gap-2 px-3 text-sm no-underline transition-colors',
      skin.chip,
      active && cn('font-semibold', skin.active),
    );
  const scale = 10 ** CURRENCY_EXPONENT[currency];
  const groups = [
    facets.kinds.length > 1 && {
      key: 'kind',
      label: 'Sorte',
      items: facets.kinds.map((k) => ({
        label: k.label,
        count: k.count,
        active: params.kind === k.value,
        href: catalogHref(base, params, { kind: params.kind === k.value ? undefined : k.value }),
      })),
    },
    ...facets.attributes.map((group) => ({
      key: `a-${group.key}`,
      label: group.label,
      items: group.values.map((v) => {
        const token = `${group.key}:${v.value}`;
        return {
          label: v.label,
          count: v.count,
          active: params.a.includes(token),
          href: catalogHref(base, params, { a: toggle(params.a, token) }),
        };
      }),
    })),
    ...facets.options.map((group) => ({
      key: `o-${group.type}`,
      label: group.label,
      items: group.values.map((v) => {
        const token = `${group.type}:${v.value}`;
        return {
          label: v.value,
          count: v.count,
          swatch: v.swatch,
          active: params.o.includes(token),
          href: catalogHref(base, params, { o: toggle(params.o, token) }),
        };
      }),
    })),
    facets.brands.length > 1 && {
      key: 'brand',
      label: 'Marque',
      items: facets.brands.map((b) => ({
        label: b.name,
        count: b.count,
        active: params.brand === b.slug,
        href: catalogHref(base, params, { brand: params.brand === b.slug ? undefined : b.slug }),
      })),
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    items: { label: string; count: number; active: boolean; href: string; swatch?: string | null }[];
  }[];

  const body = (
    <div className={cn('flex flex-col gap-5', skin.body)}>
      {groups.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-2">
          <legend className={cn('mb-2 text-sm font-semibold', skin.legend)}>{group.label}</legend>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <Link key={item.label} href={item.href} scroll={false} aria-pressed={item.active} className={chip(item.active)}>
                {item.swatch !== undefined && item.swatch !== null && (
                  <span aria-hidden className="size-4 rounded-full ring-1 ring-current/25" style={{ backgroundColor: item.swatch }} />
                )}
                {item.active && item.swatch == null && <Check className="size-3.5" aria-hidden />}
                {item.label}
                <span className="tabular opacity-60">{item.count}</span>
              </Link>
            ))}
          </div>
        </fieldset>
      ))}
      {facets.price && facets.price.max > facets.price.min && (
        <form action={base} method="get" className="flex flex-col gap-2">
          <p className={cn('text-sm font-semibold', skin.legend)}>Prix ({currency === 'XOF' ? 'F CFA' : '€'})</p>
          {params.kind && <input type="hidden" name="kind" value={params.kind} />}
          {params.o.map((v) => (
            <input key={v} type="hidden" name="o" value={v} />
          ))}
          {params.a.map((v) => (
            <input key={v} type="hidden" name="a" value={v} />
          ))}
          <div className="flex items-center gap-2">
            <input
              name="priceMin"
              inputMode="numeric"
              aria-label="Prix minimum"
              placeholder={String(Math.floor(facets.price.min / scale))}
              defaultValue={params.priceMin}
              className="tabular min-h-10 w-full min-w-0 border border-current/25 bg-transparent px-3 text-sm"
            />
            <span aria-hidden>–</span>
            <input
              name="priceMax"
              inputMode="numeric"
              aria-label="Prix maximum"
              placeholder={String(Math.ceil(facets.price.max / scale))}
              defaultValue={params.priceMax}
              className="tabular min-h-10 w-full min-w-0 border border-current/25 bg-transparent px-3 text-sm"
            />
            <button type="submit" className={chip(false)}>
              OK
            </button>
          </div>
        </form>
      )}
      {count > 0 && (
        <Link href={base} className="self-start text-sm font-semibold underline decoration-1 underline-offset-4">
          Tout effacer
        </Link>
      )}
    </div>
  );

  return (
    <div className={className}>
      <details className="group md:hidden">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtrer{count > 0 ? ` (${count})` : ''}
        </summary>
        <div className="pt-4">{body}</div>
      </details>
      <div className="hidden md:block">{body}</div>
    </div>
  );
}

/** Tri du catalogue, en liens. */
export function SortLinks({
  base,
  params,
  hasCollection,
  className,
  linkClassName,
  activeClassName,
}: {
  base: string;
  params: CatalogParams;
  hasCollection: boolean;
  className?: string;
  linkClassName?: string;
  activeClassName?: string;
}) {
  const sorts: StorefrontSort[] = hasCollection ? ['featured', 'newest', 'price-asc', 'price-desc'] : ['newest', 'price-asc', 'price-desc'];
  const current = params.sort ?? (hasCollection ? 'featured' : 'newest');
  return (
    <nav aria-label="Trier" className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm', className)}>
      {sorts.map((sort) => (
        <Link
          key={sort}
          href={catalogHref(base, params, { sort })}
          scroll={false}
          aria-current={current === sort ? 'true' : undefined}
          className={cn('inline-flex min-h-10 items-center no-underline', linkClassName, current === sort && cn('font-semibold', activeClassName))}
        >
          {SORT_LABELS[sort]}
        </Link>
      ))}
    </nav>
  );
}

/** Page suivante du catalogue (pagination par curseur), et retour au début. */
export function CatalogPager({
  base,
  params,
  nextCursor,
  className,
  linkClassName,
}: {
  base: string;
  params: CatalogParams;
  nextCursor: string | null;
  className?: string;
  linkClassName?: string;
}) {
  if (!nextCursor && !params.cursor) return null;
  return (
    <nav aria-label="Pages du catalogue" className={cn('flex flex-wrap items-center justify-center gap-4', className)}>
      {params.cursor && (
        <Link href={catalogHref(base, params, {})} className="inline-flex min-h-11 items-center text-sm font-semibold">
          Revenir au début
        </Link>
      )}
      {nextCursor && (
        <Link href={catalogHref(base, params, { cursor: nextCursor })} className={cn('inline-flex min-h-11 items-center px-6 font-semibold no-underline', linkClassName)}>
          Voir la suite
        </Link>
      )}
    </nav>
  );
}
