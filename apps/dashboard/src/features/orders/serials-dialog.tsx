import type { OrderDto } from '@marche/contracts';
import { Truck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/field';

/** Champs affichés par ligne : au-delà, le marchand colle une liste (un numéro par ligne). */
const MAX_FIELDS = 6;

/** Contrôle de Luhn d'un IMEI (15 chiffres) : repère une faute de frappe, sans bloquer l'expédition. */
export function looksLikeBadImei(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length !== 15) return digits.length > 8;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(digits[14 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 !== 0;
}

/**
 * Expédier en notant l'IMEI ou le numéro de série de chaque appareil (réglage de la boutique Tech).
 * Les numéros restent facultatifs : on peut expédier sans, et ils partent dans l'e-mail du client.
 */
export function SerialsDialog({
  order,
  open,
  onOpenChange,
  loading,
  onConfirm,
}: {
  order: OrderDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: (serials: { lineId: string; values: string[] }[]) => void;
}) {
  const lines = order.lines.filter((line) => !line.custom);
  const [values, setValues] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      lines.map((line) => [
        line.id,
        Array.from({ length: Math.min(line.quantity, MAX_FIELDS) }, () => ''),
      ]),
    ),
  );
  const set = (lineId: string, index: number, value: string) =>
    setValues((prev) => ({
      ...prev,
      [lineId]: prev[lineId]!.map((v, i) => (i === index ? value : v)),
    }));
  const entries = Object.entries(values)
    .map(([lineId, list]) => ({
      lineId,
      values: list
        .flatMap((v) => v.split(/[\n,;]+/))
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((entry) => entry.values.length > 0);
  const all = entries.flatMap((e) => e.values);
  const duplicate = all.find((v, i) => all.indexOf(v) !== i);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Expédier la commande"
      description="Notez l’IMEI (tapez *#06# sur le téléphone) ou le numéro de série de chaque appareil. Il figurera sur la commande et dans l’e-mail du client."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!duplicate) onConfirm(entries);
        }}
      >
        <div className="flex max-h-[50vh] flex-col gap-5 overflow-y-auto pr-1">
          {lines.map((line) => (
            <fieldset key={line.id} className="flex flex-col gap-2">
              <legend className="mb-1 font-[600]">
                {line.productTitle}
                {line.variantTitle !== 'Par défaut' && (
                  <span className="font-[450] text-ink-2">
                    {' '}
                    · {line.variantTitle}
                  </span>
                )}
                <span className="tabular font-[450] text-ink-2">
                  {' '}
                  · {line.quantity} ex.
                </span>
              </legend>
              {values[line.id]!.map((value, index) => {
                const suspicious =
                  value.trim() !== '' && looksLikeBadImei(value);
                return (
                  <div key={index} className="flex flex-col gap-1">
                    <Input
                      aria-label={`IMEI ou numéro de série, ${line.productTitle}, exemplaire ${index + 1}`}
                      value={value}
                      inputMode="text"
                      autoComplete="off"
                      className="tabular"
                      placeholder={
                        line.quantity > MAX_FIELDS && index === MAX_FIELDS - 1
                          ? 'Un numéro par ligne ou séparés par des virgules'
                          : `Exemplaire ${index + 1}`
                      }
                      onChange={(e) => set(line.id, index, e.target.value)}
                    />
                    {suspicious && (
                      <span className="text-[0.8125rem] text-ink-2">
                        Cet IMEI semble mal recopié (15 chiffres attendus) :
                        vérifiez-le.
                      </span>
                    )}
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>
        {duplicate && (
          <p
            role="alert"
            className="text-[0.875rem] font-[560] text-danger-ink"
          >
            « {duplicate} » est saisi deux fois.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Truck strokeWidth={1.8} />}
            loading={loading}
            disabled={Boolean(duplicate)}
          >
            {all.length > 0 ? 'Expédier' : 'Expédier sans numéro'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
