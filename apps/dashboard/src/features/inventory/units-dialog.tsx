import { type InventoryItemDto, looksLikeBadImei, type StockUnitDto, type StockUnitStatus, type UnitCondition } from '@marche/contracts';
import { PackagePlus, Pencil, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime, plural } from '@/shared/lib/format';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';
import { parseSerials } from '../products/model/product-draft';
import { useReceiveUnits, useUnitMovement, useUnits, useUpdateUnit } from './api';

const STATUS_TABS: { value: StockUnitStatus; label: string }[] = [
  { value: 'IN_STOCK', label: 'En stock' },
  { value: 'SOLD', label: 'Vendues' },
  { value: 'REMOVED', label: 'Sorties' },
];

function itemLabel(item: InventoryItemDto): string {
  return item.variantTitle && item.variantTitle !== 'Par défaut' ? `${item.productTitle} · ${item.variantTitle}` : item.productTitle;
}

/**
 * Stock d'une variante suivie à l'unité : chaque appareil a son IMEI. On reçoit des unités,
 * on corrige un IMEI mal saisi, on sort une unité (perte, défaut) ou on la remet en stock.
 */
export function UnitsDialog({ item, onClose }: { item: InventoryItemDto | null; onClose: () => void }) {
  const [status, setStatus] = useState<StockUnitStatus>('IN_STOCK');
  const [receiving, setReceiving] = useState(false);
  const units = useUnits(item?.variantId ?? null, status);
  const list = units.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setReceiving(false);
          setStatus('IN_STOCK');
        }
      }}
      title="Unités"
      description={item ? `${itemLabel(item)} · ${plural(item.onHand, 'unité en main', 'unités en main')}` : undefined}
    >
      {item && (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false} mode="wait">
            {receiving ? (
              <motion.div key="reception" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={glide}>
                <ReceiveForm variantId={item.variantId} onDone={() => setReceiving(false)} />
              </motion.div>
            ) : (
              <motion.div key="liste" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Tabs label="État des unités" items={STATUS_TABS} value={status} onChange={setStatus} />
                  <Button size="sm" variant="secondary" icon={<PackagePlus />} onClick={() => setReceiving(true)}>
                    Recevoir
                  </Button>
                </div>
                {units.error ? (
                  <LoadError message={errorMessage(units.error)} onRetry={() => void units.refetch()} />
                ) : units.isPending ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : list.length === 0 ? (
                  <p className="text-[0.9375rem] text-ink-2">
                    {status === 'IN_STOCK' ? 'Aucune unité en stock : « Recevoir » pour saisir des IMEI.' : 'Aucune unité ici.'}
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
                    {list.map((unit) => (
                      <UnitRow key={`${unit.id}-${unit.updatedAt}`} unit={unit} />
                    ))}
                  </ul>
                )}
                {units.hasNextPage && (
                  <Button variant="ghost" size="sm" className="self-center" loading={units.isFetchingNextPage} onClick={() => void units.fetchNextPage()}>
                    Voir plus
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Dialog>
  );
}

function UnitRow({ unit }: { unit: StockUnitDto }) {
  const update = useUpdateUnit();
  const movement = useUnitMovement();
  const [editing, setEditing] = useState(unit.placeholder);
  const [serial, setSerial] = useState(unit.placeholder ? '' : unit.serial);
  const [confirm, setConfirm] = useState<'remove' | 'return' | null>(null);
  const [reason, setReason] = useState('');

  const saveSerial = () =>
    update.mutate(
      { unitId: unit.id, input: { serial } },
      { onSuccess: () => toast('IMEI enregistré', { description: serial }), onError: (error) => toast.error(errorMessage(error)) },
    );
  const move = () =>
    confirm &&
    movement.mutate(
      { unitId: unit.id, action: confirm, reason: reason.trim() },
      {
        onSuccess: () => toast(confirm === 'remove' ? 'Unité sortie du stock' : 'Unité remise en stock', { description: unit.serial }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <li className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Led tone={unit.placeholder ? 'attention' : unit.status === 'IN_STOCK' ? 'on' : 'off'} />
          {unit.placeholder && !editing ? (
            <span className="font-[600] text-accent-ink">IMEI à saisir</span>
          ) : (
            <span className="tabular truncate font-[600] tracking-[0.02em]">{unit.placeholder ? 'IMEI à saisir' : unit.serial}</span>
          )}
          {unit.batteryHealth !== null && <span className="tabular text-[0.8125rem] text-ink-2">batterie {unit.batteryHealth} %</span>}
          {unit.condition === 'USED' && <span className="legend">occasion</span>}
        </span>
        <span className="flex shrink-0 items-center">
          {unit.status === 'IN_STOCK' && !editing && (
            <Button size="sm" variant="ghost" icon={<Pencil />} aria-label="Corriger l’IMEI" onClick={() => setEditing(true)} />
          )}
          {unit.status === 'IN_STOCK' ? (
            <Button size="sm" variant="ghost" icon={<X />} onClick={() => setConfirm(confirm ? null : 'remove')}>
              Sortir
            </Button>
          ) : (
            <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setConfirm(confirm ? null : 'return')}>
              Remettre
            </Button>
          )}
        </span>
      </div>
      {unit.status !== 'IN_STOCK' && (
        <span className="text-[0.8125rem] text-ink-3">
          {unit.status === 'SOLD' ? 'Vendue' : 'Sortie'} le {formatDateTime(unit.updatedAt)}
          {unit.notes ? ` · ${unit.notes}` : ''}
        </span>
      )}
      {editing && unit.status === 'IN_STOCK' && (
        <form
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveSerial();
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Input
              autoFocus
              aria-label="IMEI ou numéro de série"
              className="tabular h-9"
              inputMode="numeric"
              value={serial}
              placeholder="*#06# sur le téléphone"
              onChange={(event) => setSerial(event.target.value)}
            />
            {looksLikeBadImei(serial.replace(/\s/g, '')) && (
              <span className="text-[0.75rem] font-[560] text-accent-ink">Clé de contrôle fausse : vérifiez les chiffres.</span>
            )}
          </div>
          <Button type="submit" size="sm" variant="primary" loading={update.isPending} disabled={!serial.trim()} className="max-md:h-9">
            Enregistrer
          </Button>
        </form>
      )}
      {confirm && (
        <form
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            move();
          }}
        >
          <Input
            autoFocus
            aria-label={confirm === 'remove' ? 'Motif de la sortie' : 'Motif du retour'}
            className="h-9 flex-1"
            value={reason}
            placeholder={confirm === 'remove' ? 'Écran cassé, vol…' : 'Retour client'}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button type="submit" size="sm" variant={confirm === 'remove' ? 'danger' : 'primary'} loading={movement.isPending} disabled={!reason.trim()} className="max-md:h-9">
            {confirm === 'remove' ? 'Sortir' : 'Remettre'}
          </Button>
        </form>
      )}
    </li>
  );
}

function ReceiveForm({ variantId, onDone }: { variantId: string; onDone: () => void }) {
  const receive = useReceiveUnits();
  const [text, setText] = useState('');
  const [condition, setCondition] = useState<UnitCondition>('NEW');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { units, error: parseError } = parseSerials(text);
  const suspicious = units.filter((unit) => looksLikeBadImei(unit.serial));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        receive.mutate(
          { variantId, input: { units, condition, reason: reason.trim() || undefined } },
          {
            onSuccess: () => {
              toast('Unités reçues', { description: plural(units.length, 'IMEI ajouté au stock', 'IMEI ajoutés au stock') });
              onDone();
            },
            onError: (caught) => setError(errorMessage(caught)),
          },
        );
      }}
    >
      <Field
        label="IMEI ou numéros de série"
        hint={`${plural(units.length, 'unité', 'unités')} · un par ligne ; la douchette les enchaîne.`}
        error={parseError ?? error ?? undefined}
      >
        {(props) => (
          <Textarea
            {...props}
            autoFocus
            className="tabular min-h-32 tracking-[0.02em]"
            spellCheck={false}
            value={text}
            placeholder={'356938035643809\n356938035643817'}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </Field>
      {suspicious.length > 0 && (
        <p className="text-[0.8125rem] font-[560] text-accent-ink">
          {suspicious.map((unit) => unit.serial).join(', ')} : clé de contrôle fausse, sûrement une faute de frappe.
        </p>
      )}
      <Tabs
        label="État des unités reçues"
        items={[
          { value: 'NEW' as const, label: 'Neuves' },
          { value: 'USED' as const, label: 'Occasion' },
        ]}
        value={condition}
        onChange={setCondition}
        className="self-start"
      />
      <Field label="Motif" hint="Facultatif : fournisseur, arrivage…">
        {(props) => <Input {...props} value={reason} onChange={(event) => setReason(event.target.value)} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Retour
        </Button>
        <Button type="submit" variant="primary" loading={receive.isPending} disabled={units.length === 0 || Boolean(parseError)}>
          {units.length > 0 ? `Recevoir ${plural(units.length, 'unité', 'unités')}` : 'Recevoir'}
        </Button>
      </div>
    </form>
  );
}
