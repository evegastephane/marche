import { formatAttribute, KIND_ATTRIBUTES, type ProductAttributes, type ProductKind } from '@marche/contracts';
import { cn } from '@/lib/format';

/** Lignes renseignées de la fiche d'une sorte d'article, dans l'ordre du registre. */
export function specRows(kind: ProductKind | null, attributes: ProductAttributes, exclude: string[] = []) {
  if (!kind) return [];
  return KIND_ATTRIBUTES[kind].flatMap((field) => {
    const value = attributes[field.key];
    if (value === undefined || exclude.includes(field.key)) return [];
    return [{ key: field.key, label: field.label, value: formatAttribute(field, value) }];
  });
}

/**
 * Fiche technique ou détails (matière, entretien, écran, batterie…) en liste de définitions.
 * Chaque template lui donne sa typographie ; la structure reste lisible par les lecteurs d'écran.
 */
export function SpecSheet({
  kind,
  attributes,
  exclude,
  className,
  rowClassName,
}: {
  kind: ProductKind | null;
  attributes: ProductAttributes;
  exclude?: string[];
  className?: string;
  rowClassName?: string;
}) {
  const rows = specRows(kind, attributes, exclude);
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
