import type { SizeGuide } from '@marche/contracts';
import { Plus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';

const MAX_COLUMNS = 8;
const MAX_ROWS = 30;

const cellClasses =
  'h-9 w-full min-w-[6.5rem] rounded-lg bg-surface-2 px-2.5 text-[0.875rem] text-ink shadow-[inset_0_0_0_1px_var(--color-line)] transition-[box-shadow,background-color] duration-200 placeholder:text-ink-3 focus-visible:bg-surface focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-ink)] focus-visible:outline-none max-md:h-10 max-md:text-base';

/**
 * Guide des tailles d'une sorte d'article : une table qu'on remplit comme un tableur
 * (en-têtes de colonnes, puis une ligne par taille). Affiché sur les fiches du site.
 */
export function SizeGuideEditor({
  guide,
  onChange,
  onReset,
  error,
}: {
  guide: SizeGuide;
  onChange: (guide: SizeGuide) => void;
  /** Revenir au guide proposé par Upsell. */
  onReset?: () => void;
  error?: string;
}) {
  const setColumn = (index: number, value: string) =>
    onChange({ ...guide, columns: guide.columns.map((c, i) => (i === index ? value : c)) });
  const setCell = (row: number, column: number, value: string) =>
    onChange({
      ...guide,
      rows: guide.rows.map((cells, r) => (r === row ? cells.map((c, i) => (i === column ? value : c)) : cells)),
    });
  const addColumn = () =>
    onChange({ ...guide, columns: [...guide.columns, ''], rows: guide.rows.map((cells) => [...cells, '']) });
  const removeColumn = (index: number) =>
    onChange({
      ...guide,
      columns: guide.columns.filter((_, i) => i !== index),
      rows: guide.rows.map((cells) => cells.filter((_, i) => i !== index)),
    });
  const addRow = () => onChange({ ...guide, rows: [...guide.rows, guide.columns.map(() => '')] });
  const removeRow = (index: number) => onChange({ ...guide, rows: guide.rows.filter((_, i) => i !== index) });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Titre">
        {(props) => (
          <Input {...props} value={guide.title} maxLength={80} onChange={(e) => onChange({ ...guide, title: e.target.value })} />
        )}
      </Field>

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full border-separate border-spacing-1.5 text-left">
          <thead>
            <tr>
              {guide.columns.map((column, index) => (
                <th key={index} scope="col" className="align-bottom font-normal">
                  <span className="flex items-center gap-1">
                    <input
                      aria-label={`Colonne ${index + 1}`}
                      value={column}
                      maxLength={40}
                      placeholder="Colonne"
                      onChange={(e) => setColumn(index, e.target.value)}
                      className={`${cellClasses} font-[600]`}
                    />
                    {guide.columns.length > 2 && (
                      <button
                        type="button"
                        aria-label={`Retirer la colonne ${column || index + 1}`}
                        onClick={() => removeColumn(index)}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <X className="size-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </span>
                </th>
              ))}
              <th aria-hidden className="w-9" />
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((cells, row) => (
              <tr key={row}>
                {cells.map((cell, column) => (
                  <td key={column}>
                    <input
                      aria-label={`${guide.columns[column] || `Colonne ${column + 1}`}, ligne ${row + 1}`}
                      value={cell}
                      maxLength={40}
                      onChange={(e) => setCell(row, column, e.target.value)}
                      className={`${cellClasses} tabular`}
                    />
                  </td>
                ))}
                <td className="w-9">
                  {guide.rows.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Retirer la ligne ${cells[0] || row + 1}`}
                      onClick={() => removeRow(row)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <X className="size-3.5" strokeWidth={2} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={addRow} disabled={guide.rows.length >= MAX_ROWS}>
          Ligne
        </Button>
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={addColumn} disabled={guide.columns.length >= MAX_COLUMNS}>
          Colonne
        </Button>
        {onReset && (
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={onReset} className="ml-auto">
            Guide d’origine
          </Button>
        )}
      </div>

      <Field label="Conseil de mesure" hint="Affiché sous le tableau, sur le site." error={error}>
        {(props) => (
          <Textarea
            {...props}
            rows={2}
            maxLength={300}
            value={guide.note ?? ''}
            onChange={(e) => onChange({ ...guide, note: e.target.value || undefined })}
          />
        )}
      </Field>
    </div>
  );
}
