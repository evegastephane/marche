import type { StorefrontSort } from '@marche/contracts';

/** Filtres d'une page de catalogue, lus dans l'URL (partageable, sans JavaScript). */
export interface CatalogParams {
  kind?: string;
  /** Slug de catégorie (« Voir tout » d'une sélection de l'accueil), dans l'URL en « categorie ». */
  category?: string;
  /** Options : « size:M », « color:Bleu »… */
  o: string[];
  /** Attributs : « audience:FEMME », « accessoryType:CHARGER »… */
  a: string[];
  brand?: string;
  sort?: StorefrontSort;
  /** Prix en unités de la devise (F CFA, euros), convertis pour l'API. */
  priceMin?: number;
  priceMax?: number;
  cursor?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined) =>
  (value === undefined ? [] : Array.isArray(value) ? value : [value]).filter((v) => /^[A-Za-z_]{1,40}:.{1,40}$/.test(v)).slice(0, 20);
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;
const amount = (value: string | string[] | undefined) => {
  const n = Number(one(value));
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};
const SORTS: StorefrontSort[] = ['featured', 'newest', 'price-asc', 'price-desc'];

export function parseCatalogParams(params: SearchParams): CatalogParams {
  const sort = one(params.sort) as StorefrontSort | undefined;
  return {
    kind: one(params.kind),
    category: one(params.categorie)?.slice(0, 100),
    o: list(params.o),
    a: list(params.a),
    brand: one(params.brand),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    priceMin: amount(params.priceMin),
    priceMax: amount(params.priceMax),
    cursor: one(params.cursor),
  };
}

/** Lien vers la même page avec un changement de filtre ; changer un filtre revient à la première page. */
export function catalogHref(base: string, params: CatalogParams, change: Partial<CatalogParams>): string {
  const next: CatalogParams = { ...params, cursor: undefined, ...change };
  const search = new URLSearchParams();
  if (next.category) search.set('categorie', next.category);
  if (next.kind) search.set('kind', next.kind);
  for (const v of next.o) search.append('o', v);
  for (const v of next.a) search.append('a', v);
  if (next.brand) search.set('brand', next.brand);
  if (next.sort) search.set('sort', next.sort);
  if (next.priceMin !== undefined) search.set('priceMin', String(next.priceMin));
  if (next.priceMax !== undefined) search.set('priceMax', String(next.priceMax));
  if (next.cursor) search.set('cursor', next.cursor);
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function activeFilterCount(params: CatalogParams): number {
  return (
    params.o.length +
    params.a.length +
    (params.kind ? 1 : 0) +
    (params.category ? 1 : 0) +
    (params.brand ? 1 : 0) +
    (params.priceMin !== undefined || params.priceMax !== undefined ? 1 : 0)
  );
}

/** Filtres de la page → requête de l'API (prix en unités mineures). */
export function toProductQuery(params: CatalogParams, exponent: number) {
  const scale = 10 ** exponent;
  return {
    kind: params.kind,
    category: params.category,
    o: params.o,
    a: params.a,
    brand: params.brand,
    sort: params.sort,
    cursor: params.cursor,
    priceMin: params.priceMin !== undefined ? params.priceMin * scale : undefined,
    priceMax: params.priceMax !== undefined ? params.priceMax * scale : undefined,
  };
}
