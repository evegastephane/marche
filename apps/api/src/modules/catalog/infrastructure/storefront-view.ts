import {
  categoryPath,
  LEGACY_SPEC_KEY_BY_SLUG,
  DEVICE_KINDS,
  inferOptionType,
  type OptionType,
  type ProductAttributes,
  type ProductKind,
  type ProductOption,
  type ProductSpecs,
  resolveCategoryAttributes,
  type EffectiveAttribute,
  type SpecValue,
  swatchFor,
  type TaxonomyAttribute,
  type TaxonomyCategory,
  type TaxonomyLink,
  type VariantOptions,
} from '@marche/contracts';

/**
 * Vue du catalogue dynamique pour le site public.
 *
 * Transitoire (étape 5 du plan) : les templates du site lisent encore la forme « verticals »
 * (`kind`, `attributes` à clés fixes, options positionnelles typées). Ce module la reconstruit
 * depuis les catégories, la fiche technique (`specs`) et les axes des variantes, à côté des
 * nouveaux champs (`category`, `specs` résolues). Il disparaîtra quand les templates liront `specs`.
 */

/** Rayon → ancienne sorte d'article ; la catégorie la plus profonde l'emporte. */
const KIND_BY_CATEGORY: Record<string, ProductKind> = {
  vetements: 'CLOTHING',
  chaussures: 'SHOES',
  'accessoires-mode': 'FASHION_ACCESSORY',
  smartphones: 'PHONE',
  tablettes: 'TABLET',
  ordinateurs: 'COMPUTER',
  'montres-connectees': 'WATCH',
  accessoires: 'ACCESSORY',
  audio: 'ACCESSORY',
};

const ACCESSORY_TYPE_BY_CATEGORY: Record<string, string> = {
  chargeurs: 'CHARGER',
  cables: 'CABLE',
  ecouteurs: 'EARPHONES',
  casques: 'HEADPHONES',
  enceintes: 'SPEAKER',
  'coques-pochettes': 'CASE',
  'batteries-externes': 'POWER_BANK',
};

const LEGACY_KEY_BY_SLUG = LEGACY_SPEC_KEY_BY_SLUG;

const AUDIENCE_CODES: Record<string, string> = { Femme: 'FEMME', Homme: 'HOMME', Enfant: 'ENFANT', Mixte: 'MIXTE' };

/** Anciennes clés de filtre du site → attribut (a=audience:FEMME → rayon = Femme). */
export const LEGACY_FILTER_KEYS: Record<string, { slug: string; value: (code: string) => string }> = {
  audience: {
    slug: 'rayon',
    value: (code) => Object.entries(AUDIENCE_CODES).find(([, c]) => c === code)?.[0] ?? code,
  },
};

const OPTION_TYPE_BY_SLUG: Record<string, OptionType> = {
  taille: 'size',
  pointure: 'shoe_size',
  couleur: 'color',
  stockage: 'storage',
  ram: 'memory',
  memoire: 'memory',
  'taille-ecran': 'screen',
  etat: 'condition',
  modele: 'model',
};

export function optionTypeOf(attribute: Pick<TaxonomyAttribute, 'slug' | 'name'>): OptionType {
  return OPTION_TYPE_BY_SLUG[attribute.slug] ?? inferOptionType(attribute.name);
}

/** Valeur lisible d'une fiche : « 6,3 pouces », « Oui », « Wi-Fi, Bluetooth ». */
export function formatSpec(value: SpecValue, unit: string | null): string {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return `${value.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

export interface StorefrontSpec {
  slug: string;
  label: string;
  value: string;
}

/** Arbre et attributs d'une boutique, lus une fois par requête. */
export class StorefrontTaxonomy {
  private readonly bySlug: Map<string, TaxonomyAttribute>;
  private readonly effectiveCache = new Map<string, EffectiveAttribute[]>();

  constructor(
    readonly categories: readonly TaxonomyCategory[],
    readonly attributes: readonly TaxonomyAttribute[],
    private readonly links: readonly TaxonomyLink[],
  ) {
    this.bySlug = new Map(attributes.map((attribute) => [attribute.slug, attribute]));
  }

  attribute(slug: string): TaxonomyAttribute | undefined {
    return this.bySlug.get(slug);
  }

  category(id: string | null): TaxonomyCategory | undefined {
    return id ? this.categories.find((category) => category.id === id) : undefined;
  }

  /** Attributs effectifs d'une catégorie, dans l'ordre (hérités d'abord). */
  effective(categoryId: string | null): EffectiveAttribute[] {
    if (!categoryId || !this.category(categoryId)) return [];
    let found = this.effectiveCache.get(categoryId);
    if (!found) {
      found = resolveCategoryAttributes(categoryId, this.categories, this.attributes, this.links);
      this.effectiveCache.set(categoryId, found);
    }
    return found;
  }

  private path(categoryId: string | null): TaxonomyCategory[] {
    return categoryId && this.category(categoryId) ? categoryPath(categoryId, this.categories) : [];
  }

  /** Slugs de la racine à la catégorie (guide des tailles, fil d'Ariane). */
  pathSlugs(categoryId: string | null): string[] {
    return this.path(categoryId).map((category) => category.slug);
  }

  kind(categoryId: string | null): ProductKind | null {
    for (const category of this.path(categoryId).reverse()) {
      const kind = KIND_BY_CATEGORY[category.slug];
      if (kind) return kind;
    }
    return null;
  }

  isDevice(categoryId: string | null): boolean {
    const kind = this.kind(categoryId);
    return (kind !== null && DEVICE_KINDS.includes(kind)) || this.path(categoryId).some((category) => category.tracksUnits);
  }

  /** Catégories dont la sorte dérivée est celle demandée (filtre ?kind= du site). */
  categoryIdsOfKind(kind: ProductKind): string[] {
    return this.categories.filter((category) => this.kind(category.id) === kind).map((category) => category.id);
  }

  /** Ancien filtre a=accessoryType:CHARGER : la catégorie correspondante et ses sous-catégories. */
  categoryIdsOfAccessoryTypes(codes: readonly string[]): string[] {
    return this.categories
      .filter((category) => this.path(category.id).some((c) => codes.includes(ACCESSORY_TYPE_BY_CATEGORY[c.slug] ?? '')))
      .map((category) => category.id);
  }

  /** Axes (attributs de variante) d'une nature donnée : ?o=color:Noir vise « couleur ». */
  axisSlugsOfType(type: OptionType): string[] {
    return this.attributes.filter((attribute) => attribute.isVariantAxis && optionTypeOf(attribute) === type).map((a) => a.slug);
  }

  /** Axes utilisés par les variantes, dans l'ordre de la catégorie, puis ceux qu'elle ne connaît plus. */
  private axesOf(categoryId: string | null, variants: readonly VariantOptions[]): TaxonomyAttribute[] {
    const used = new Set(variants.flatMap((options) => Object.keys(options)));
    const ordered = this.effective(categoryId).filter((attribute) => used.has(attribute.slug));
    const rest = [...used]
      .filter((slug) => !ordered.some((attribute) => attribute.slug === slug))
      .map((slug): TaxonomyAttribute =>
        this.bySlug.get(slug) ?? { id: slug, slug, name: slug, type: 'SELECT', unit: null, isVariantAxis: true, filterable: false, values: [] },
      );
    return [...ordered, ...rest];
  }

  /** Options typées (avec pastilles) et valeurs positionnelles de chaque variante. */
  options(categoryId: string | null, variants: readonly VariantOptions[]): {
    options: ProductOption[];
    valuesOf: (options: VariantOptions) => string[];
  } {
    const axes = this.axesOf(categoryId, variants);
    const options = axes.map((axis): ProductOption => {
      const present = new Set(variants.map((options) => options[axis.slug]).filter((v): v is string => !!v));
      const known = axis.values.map((v) => v.value).filter((value) => present.has(value));
      const values = [...known, ...[...present].filter((value) => !known.includes(value))];
      const type = optionTypeOf(axis);
      const swatches =
        type === 'color'
          ? Object.fromEntries(
              values.flatMap((value) => {
                const hex = axis.values.find((v) => v.value === value)?.swatch ?? swatchFor({}, value);
                return hex ? [[value, hex]] : [];
              }),
            )
          : {};
      return { name: axis.name, type, values, ...(Object.keys(swatches).length ? { swatches } : {}) };
    });
    return { options, valuesOf: (variant) => axes.map((axis) => variant[axis.slug] ?? '') };
  }

  /** Pastilles d'une carte produit : valeurs de ses axes « couleur ». */
  swatches(categoryId: string | null, variants: readonly VariantOptions[]): { value: string; hex: string }[] {
    const color = this.options(categoryId, variants).options.find((option) => option.type === 'color');
    return (color?.values ?? []).flatMap((value) => {
      const hex = color?.swatches?.[value];
      return hex ? [{ value, hex }] : [];
    });
  }

  /** Fiche technique lisible, dans l'ordre de la catégorie (les axes sont montrés par les options). */
  specs(categoryId: string | null, specs: ProductSpecs): StorefrontSpec[] {
    const effective = this.effective(categoryId);
    const ordered = [
      ...effective.map((attribute) => attribute.slug),
      ...Object.keys(specs).filter((slug) => !effective.some((attribute) => attribute.slug === slug)),
    ];
    return ordered.flatMap((slug) => {
      const value = specs[slug];
      const attribute = this.bySlug.get(slug);
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0) || attribute?.isVariantAxis) return [];
      return [{ slug, label: attribute?.name ?? slug, value: formatSpec(value, attribute?.unit ?? null) }];
    });
  }

  /** Ancienne fiche à clés fixes, pour les templates qui la lisent encore. */
  legacyAttributes(categoryId: string | null, specs: ProductSpecs, warrantyMonths: number | null): ProductAttributes {
    const attributes: ProductAttributes = {};
    for (const [slug, value] of Object.entries(specs)) {
      if (slug === 'rayon' && typeof value === 'string') {
        attributes.audience = AUDIENCE_CODES[value] ?? value;
      } else if (slug === 'reseau' && typeof value === 'string') {
        attributes.network5g = value === '5G';
      } else {
        const key = LEGACY_KEY_BY_SLUG[slug];
        if (!key || attributes[key] !== undefined) continue;
        const attribute = this.bySlug.get(slug);
        // Une valeur avec unité (autonomie 20 h) garde son unité dans l'ancienne fiche texte.
        attributes[key] = typeof value === 'number' && attribute?.unit && key === 'battery' ? `${value} ${attribute.unit}` : value;
      }
    }
    for (const category of this.path(categoryId).reverse()) {
      const type = ACCESSORY_TYPE_BY_CATEGORY[category.slug];
      if (type) {
        attributes.accessoryType = type;
        break;
      }
    }
    if (warrantyMonths !== null) attributes.warrantyMonths = warrantyMonths;
    return attributes;
  }
}
