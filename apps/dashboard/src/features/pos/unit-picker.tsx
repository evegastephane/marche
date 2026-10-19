import type { Currency, PosVariantDto, UnitCondition } from '@marche/contracts';
import { BatteryMedium, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useUnits } from '@/features/inventory/api';
import { formatMoney } from '@/shared/lib/format';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { SearchInput } from '@/shared/ui/search';

const CONDITION_LABELS: Record<UnitCondition, string> = { NEW: 'Neuf', USED: 'Occasion' };

/**
 * Choisir l'appareil exact remis au client (article suivi à l'unité) : la liste de ses IMEI en stock,
 * sans ceux déjà dans le ticket. Scanner l'IMEI sur la boîte évite ce détour.
 */
export function UnitPicker({
  variant,
  taken,
  currency,
  onClose,
  onPick,
}: {
  variant: PosVariantDto | null;
  taken: readonly string[];
  currency: Currency;
  onClose: () => void;
  onPick: (serial: string) => void;
}) {
  const [q, setQ] = useState('');
  const units = useUnits(variant?.variantId ?? null, 'IN_STOCK');
  const items = (units.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (unit) => !taken.includes(unit.serial) && (!q || unit.serial.includes(q.replace(/\s/g, '').toUpperCase())),
  );

  return (
    <Dialog
      open={variant !== null}
      onOpenChange={(open) => {
        if (!open) {
          setQ('');
          onClose();
        }
      }}
      title={variant ? variant.productTitle : 'Appareil'}
      description={
        variant ? (
          <>
            {variant.variantTitle !== 'Par défaut' ? `${variant.variantTitle} · ` : ''}
            <span className="tabular">{formatMoney(variant.priceAmount, currency)}</span>. Choisissez l’appareil remis au client.
          </>
        ) : null
      }
    >
      <SearchInput value={q} onChange={setQ} placeholder="Derniers chiffres de l’IMEI" label="Chercher un IMEI" />
      {units.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Smartphone} title="Aucun appareil disponible" className="px-0 py-4">
          {q ? 'Aucun IMEI en stock ne contient ces chiffres.' : 'Tous les appareils de ce modèle sont vendus ou déjà dans le ticket.'}
        </EmptyState>
      ) : (
        <ul className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto">
          {items.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(unit.serial);
                  setQ('');
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[0.7rem] px-3 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex flex-col">
                  <span className="tabular font-[600]">{unit.serial}</span>
                  <span className="text-[0.8125rem] text-ink-2">
                    {CONDITION_LABELS[unit.condition]}
                    {unit.notes ? ` · ${unit.notes}` : ''}
                  </span>
                </span>
                {unit.batteryHealth !== null && (
                  <span className="tabular inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-2">
                    <BatteryMedium className="size-4" strokeWidth={1.8} aria-hidden />
                    {unit.batteryHealth} %
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
