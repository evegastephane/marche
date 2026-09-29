import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Tabs } from '@/shared/ui/tabs';
import { activeOptions, comboKey, type OptionDraft, type ProductDraft, swatchOf, type VariantDraft } from '../product-draft';
import { Swatch } from './option-editor';

/** La grille est proposée pour une option taille (ou pointure) et une option couleur, plus une troisième au plus. */
export function gridLayout(draft: ProductDraft) {
  const options = activeOptions(draft);
  if (options.length < 2 || options.length > 3) return null;
  const rowsIndex = options.findIndex((o) => o.type === 'size' || o.type === 'shoe_size');
  const colsIndex = options.findIndex((o) => o.type === 'color');
  if (rowsIndex === -1 || colsIndex === -1) return null;
  const layerIndex = options.findIndex((_, i) => i !== rowsIndex && i !== colsIndex);
  return { options, rowsIndex, colsIndex, layerIndex };
}

/**
 * Grille taille × couleur : chaque case est une déclinaison. À la création, on y saisit le stock
 * initial ; ensuite, on y compte le stock en main (enregistré avec le produit). Une case « — »
 * est une combinaison non proposée, qu'on rajoute d'un geste.
 */
export function StockGrid({
  draft,
  isEdit,
  onChangeVariant,
  onToggleCombo,
}: {
  draft: ProductDraft;
  isEdit: boolean;
  onChangeVariant: (key: string, patch: Partial<VariantDraft>) => void;
  onToggleCombo: (values: string[], offered: boolean) => void;
}) {
  const layout = gridLayout(draft);
  const layerOption: OptionDraft | undefined = layout && layout.layerIndex !== -1 ? layout.options[layout.layerIndex] : undefined;
  const [layer, setLayer] = useState(layerOption?.values[0] ?? '');
  if (!layout) return null;
  const { options, rowsIndex, colsIndex, layerIndex } = layout;
  const rows = options[rowsIndex]!;
  const cols = options[colsIndex]!;
  const currentLayer = layerOption && layerOption.values.includes(layer) ? layer : (layerOption?.values[0] ?? '');

  const byCombo = new Map(draft.variants.map((v) => [comboKey(v.optionValues), v]));
  const valuesFor = (row: string, col: string) =>
    options.map((_, i) => (i === rowsIndex ? row : i === colsIndex ? col : currentLayer));

  const stockOf = (variant: VariantDraft) =>
    variant.id ? Number(variant.count.trim() === '' ? (variant.onHand ?? 0) : variant.count) || 0 : Number(variant.quantity) || 0;
  const rowTotal = (row: string) =>
    cols.values.reduce((sum, col) => {
      const v = byCombo.get(comboKey(valuesFor(row, col)));
      return sum + (v ? stockOf(v) : 0);
    }, 0);

  return (
    <div className="flex flex-col gap-3">
      {layerOption && layerIndex !== -1 && (
        <Tabs
          label={layerOption.name}
          items={layerOption.values.map((v) => ({ value: v, label: v }))}
          value={currentLayer}
          onChange={setLayer}
          className="self-start"
        />
      )}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full border-separate border-spacing-1 text-left">
          <thead>
            <tr>
              <th scope="col" className="legend px-1 pb-1 align-bottom font-[600] whitespace-nowrap">
                {rows.name} / {cols.name}
              </th>
              {cols.values.map((col) => (
                <th key={col} scope="col" className="px-1 pb-1 align-bottom">
                  <span className="flex items-center gap-1.5 text-[0.8125rem] font-[600] whitespace-nowrap">
                    <Swatch hex={swatchOf(cols, col)} />
                    {col}
                  </span>
                </th>
              ))}
              <th scope="col" className="legend px-1 pb-1 text-right align-bottom font-[600]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.values.map((row) => (
              <tr key={row}>
                <th scope="row" className="px-1 text-[0.875rem] font-[650] whitespace-nowrap">
                  {row}
                </th>
                {cols.values.map((col) => {
                  const values = valuesFor(row, col);
                  const variant = byCombo.get(comboKey(values));
                  const label = values.join(' / ');
                  if (!variant) {
                    return (
                      <td key={col}>
                        <button
                          type="button"
                          onClick={() => onToggleCombo(values, true)}
                          aria-label={`Proposer ${label}`}
                          className="group flex h-10 w-full min-w-[4.5rem] items-center justify-center rounded-lg border border-dashed border-line-strong text-ink-3 transition-colors hover:border-ink-3 hover:text-ink max-md:h-11"
                        >
                          <span className="group-hover:hidden group-focus-visible:hidden" aria-hidden>
                            —
                          </span>
                          <Plus className="hidden size-4 group-hover:block group-focus-visible:block" strokeWidth={1.8} aria-hidden />
                        </button>
                      </td>
                    );
                  }
                  const existing = Boolean(variant.id);
                  const counted = existing && variant.count.trim() !== '' && Number(variant.count) !== variant.onHand;
                  return (
                    <td key={col}>
                      <span className="group relative flex">
                        <input
                          aria-label={existing ? `Stock compté ${label}` : `Stock initial ${label}`}
                          inputMode="numeric"
                          value={existing ? variant.count : variant.quantity}
                          placeholder={existing ? String(variant.onHand ?? 0) : '0'}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
                            onChangeVariant(variant.key, existing ? { count: digits } : { quantity: digits });
                          }}
                          className={cn(
                            'tabular h-10 w-full min-w-[4.5rem] rounded-lg bg-surface-2 px-2.5 text-right text-[0.9375rem] text-ink shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line)] transition-[box-shadow,background-color] duration-200 placeholder:text-ink-2 focus-visible:bg-surface focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-ink)] focus-visible:outline-none max-md:h-11 max-md:text-base',
                            counted && 'font-[650] shadow-[inset_0_0_0_1.5px_var(--color-ink)]',
                          )}
                        />
                        {draft.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onToggleCombo(values, false)}
                            aria-label={`Ne plus proposer ${label}`}
                            className="absolute top-1/2 left-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface-3 hover:text-ink [@media(hover:none)]:opacity-100"
                          >
                            <X className="size-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </span>
                    </td>
                  );
                })}
                <td className="tabular px-1 text-right text-[0.875rem] font-[560] text-ink-2">{rowTotal(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.8125rem] text-ink-2">
        {isEdit
          ? 'Saisissez le stock compté : l’écart est enregistré comme un comptage. « — » : combinaison non proposée.'
          : 'Stock de départ de chaque combinaison. « — » : combinaison non proposée, touchez-la pour l’ajouter.'}
      </p>
    </div>
  );
}
