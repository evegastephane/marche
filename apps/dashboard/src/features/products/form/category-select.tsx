import { Link } from '@tanstack/react-router';
import { Field, Select } from '@/shared/ui/field';
import { flattenTree, useCategories } from '../../categories/api';

/** Catégorie du produit : l'arbre de la boutique, en retrait par niveau. */
export function CategorySelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (categoryId: string) => void;
  error?: string;
}) {
  const categories = useCategories();
  const rows = flattenTree(categories.data ?? []);
  return (
    <Field
      label="Catégorie"
      hint={
        <>
          Elle décide de la fiche technique et des variantes.{' '}
          <Link to="/categories" className="font-[600] text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Gérer les catégories
          </Link>
        </>
      }
      error={error}
    >
      {(props) => (
        <Select {...props} value={value} onChange={(event) => onChange(event.target.value)} disabled={categories.isPending}>
          <option value="" disabled>
            {categories.isPending ? 'Chargement…' : 'Choisir une catégorie'}
          </option>
          {rows.map(({ category, depth }) => (
            <option key={category.id} value={category.id}>
              {`${' '.repeat(depth)}${category.name}`}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
