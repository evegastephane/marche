import { looksLikeBadImei } from '@marche/contracts';
import { plural } from '@/shared/lib/format';
import { Textarea } from '@/shared/ui/field';
import { parseSerials } from '../model/product-draft';

/**
 * IMEI ou numéros de série d'une nouvelle variante : un par ligne, tapés (*#06#) ou scannés à la suite.
 * Le stock de la variante = le nombre d'unités saisies.
 */
export function UnitsEditor({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { units, error: parseError } = parseSerials(value);
  const suspicious = units.filter((unit) => looksLikeBadImei(unit.serial));
  const problem = error ?? parseError;
  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        aria-label={`IMEI ou numéros de série, ${label}`}
        aria-invalid={problem ? true : undefined}
        className="tabular min-h-24 text-[0.875rem] tracking-[0.02em]"
        spellCheck={false}
        value={value}
        placeholder={'356938035643809\n356938035643817'}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-[0.8125rem] text-ink-2">
        <span className="tabular font-[600] text-ink">{plural(units.length, 'unité', 'unités')}</span> · un IMEI par ligne ;
        la douchette les enchaîne toute seule.
      </span>
      {suspicious.length > 0 && !problem && (
        <span className="text-[0.8125rem] font-[560] text-accent-ink">
          {suspicious.map((unit) => unit.serial).join(', ')} : clé de contrôle fausse, sûrement une faute de frappe.
        </span>
      )}
      {problem && (
        <span data-field-error className="text-[0.8125rem] font-[560] text-danger-ink">
          {problem}
        </span>
      )}
    </div>
  );
}
