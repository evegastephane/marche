import { LEGACY_SPEC_KEY_BY_SLUG, type StorefrontProductDto } from '@marche/contracts';
import { cn } from '@/lib/format';

type SpecSource = Pick<StorefrontProductDto, 'specs'>;

/**
 * Lignes renseignées de la fiche, dans l'ordre des attributs de la catégorie (libellé et unité venus
 * de l'API). `key` garde l'ancienne clé quand elle existe, pour que les exclusions des templates
 * (compatibleModels, composition…) restent valables.
 */
export function specRows(product: SpecSource, exclude: string[] = []) {
  // Réponse mise en cache par le site avant le catalogue dynamique : pas encore de specs.
  const specs = (product.specs as StorefrontProductDto['specs'] | undefined) ?? [];
  return specs.flatMap((spec) => {
    const key = LEGACY_SPEC_KEY_BY_SLUG[spec.slug] ?? spec.slug;
    if (exclude.includes(key) || exclude.includes(spec.slug)) return [];
    return [{ key, label: spec.label, value: spec.value }];
  });
}

/**
 * Fiche technique ou détails (matière, entretien, écran, batterie…) en liste de définitions.
 * Chaque template lui donne sa typographie ; la structure reste lisible par les lecteurs d'écran.
 */
export function SpecSheet({
  product,
  exclude,
  className,
  rowClassName,
}: {
  product: SpecSource;
  exclude?: string[];
  className?: string;
  rowClassName?: string;
}) {
  const rows = specRows(product, exclude);
  if (rows.length === 0) return null;
  return (
    <dl className={cn('flex flex-col', className)}>
      {rows.map((row) => (
        <div key={row.key} className={cn('grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5', rowClassName)}>
          <dt className="opacity-75">{row.label}</dt>
          <dd className="font-semibold">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
