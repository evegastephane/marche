import {
  type AdjustableMovementType,
  adjustStockSchema,
  type InventoryItemDto,
  type StockMovementType,
} from '@marche/contracts';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { LoadError, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import { useAdjustStock, useMovements, useSetThreshold } from './api';

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  INITIAL: 'Stock initial',
  RECEIPT: 'Réception',
  ADJUSTMENT: 'Correction',
  LOSS: 'Perte',
  SALE: 'Vente',
  RETURN: 'Retour',
};

const ADJUST_TYPES: { value: AdjustableMovementType; label: string; hint: string }[] = [
  { value: 'RECEIPT', label: 'Réception', hint: 'Marchandise arrivée : le stock augmente.' },
  { value: 'RETURN', label: 'Retour', hint: 'Article rendu par un client et remis en vente.' },
  { value: 'LOSS', label: 'Perte', hint: 'Casse, vol, article abîmé : le stock baisse.' },
  { value: 'ADJUSTMENT', label: 'Correction', hint: 'Après un comptage : ajoutez ou retirez l’écart.' },
];

function itemLabel(item: InventoryItemDto): string {
  return item.variantTitle && item.variantTitle !== 'Par défaut'
    ? `${item.productTitle} · ${item.variantTitle}`
    : item.productTitle;
}

/**
 * Ajuster le stock d'une variante. Avant de valider, l'effet s'affiche en direct
 * (« En main 12 → 17 ») : un mouvement de stock ne s'efface pas, il se corrige par un autre.
 */
export function AdjustDialog({ item, onClose }: { item: InventoryItemDto | null; onClose: () => void }) {
  const adjust = useAdjustStock();
  const [type, setType] = useState<AdjustableMovementType>('RECEIPT');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setType('RECEIPT');
    setDirection(1);
    setQuantity('');
    setReason('');
    setErrors({});
  };

  const amount = Number(quantity) || 0;
  const signed = type === 'ADJUSTMENT' ? direction * amount : type === 'LOSS' ? -amount : amount;
  const after = item ? item.onHand + signed : 0;
  const tooLow = item !== null && after < item.reserved;

  const submit = () => {
    if (!item) return;
    const input = {
      type,
      quantity: type === 'ADJUSTMENT' ? signed : amount,
      reason: reason.trim() || undefined,
    };
    const parsed = adjustStockSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
      return;
    }
    if (tooLow) {
      setErrors({ quantity: `Il reste ${item.reserved} article(s) réservé(s) par des commandes : le stock ne peut pas descendre plus bas.` });
      return;
    }
    adjust.mutate(
      { variantId: item.variantId, input: parsed.data },
      {
        onSuccess: () => {
          toast('Stock mis à jour', { description: itemLabel(item) });
          reset();
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
      title="Ajuster le stock"
      description={item ? `${itemLabel(item)} · ${item.sku}` : undefined}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <Tabs
            label="Type de mouvement"
            items={ADJUST_TYPES.map(({ value, label }) => ({ value, label }))}
            value={type}
            onChange={(value) => {
              setType(value);
              setErrors({});
            }}
          />
          <p className="text-[0.8125rem] text-ink-2">{ADJUST_TYPES.find((t) => t.value === type)?.hint}</p>
        </div>

        <div className="flex items-end gap-2">
          {type === 'ADJUSTMENT' && (
            <div className="well flex shrink-0 rounded-[0.7rem] p-1" role="group" aria-label="Sens de la correction">
              {([1, -1] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={direction === d}
                  aria-label={d === 1 ? 'Ajouter' : 'Retirer'}
                  onClick={() => setDirection(d)}
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-lg transition-colors max-md:size-9',
                    direction === d ? 'bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]' : 'text-ink-3',
                  )}
                >
                  {d === 1 ? <Plus className="size-4" /> : <Minus className="size-4" />}
                </button>
              ))}
            </div>
          )}
          <Field label="Quantité" error={errors.quantity} className="flex-1">
            {(props) => (
              <Input
                {...props}
                autoFocus
                inputMode="numeric"
                className="tabular"
                value={quantity}
                placeholder="0"
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
        </div>

        {item && (
          <div className="display-window flex items-center justify-between gap-4 rounded-xl px-4 py-3">
            <span className="legend text-display-dim">En main</span>
            <span className="flex items-baseline gap-3">
              <span className="readout text-[1.25rem] text-display-dim">{item.onHand}</span>
              <ArrowRight className="size-4 self-center text-display-dim" strokeWidth={1.8} aria-hidden />
              <AnimatedNumber
                value={Math.max(after, 0)}
                className={cn('readout text-[1.75rem]', tooLow && 'text-danger-ink')}
              />
            </span>
          </div>
        )}

        <Field
          label={type === 'LOSS' || type === 'ADJUSTMENT' ? 'Motif' : 'Motif (facultatif)'}
          error={errors.reason}
        >
          {(props) => (
            <Textarea
              {...props}
              className="min-h-20"
              value={reason}
              maxLength={200}
              placeholder={type === 'LOSS' ? 'Article abîmé au transport' : type === 'RECEIPT' ? 'Livraison du fournisseur' : ''}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={adjust.isPending} disabled={amount === 0}>
            Enregistrer le mouvement
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Seuil d'alerte d'une variante, ou celui de la boutique par défaut. */
export function ThresholdDialog({
  item,
  storeDefault,
  onClose,
}: {
  item: InventoryItemDto | null;
  storeDefault: number;
  onClose: () => void;
}) {
  const setThreshold = useSetThreshold();
  const [custom, setCustom] = useState<boolean | null>(null);
  const [value, setValue] = useState<string | null>(null);
  const isCustom = custom ?? item?.hasCustomThreshold ?? false;
  const current = value ?? String(item?.lowStockThreshold ?? storeDefault);

  const close = () => {
    setCustom(null);
    setValue(null);
    onClose();
  };

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => !open && close()}
      title="Seuil d’alerte"
      description="Sous ce seuil, l’article passe en « stock bas » sur l’accueil."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!item) return;
          const threshold = isCustom ? Number(current) : null;
          if (isCustom && (!Number.isInteger(threshold) || (threshold ?? 0) < 0)) return;
          setThreshold.mutate(
            { variantId: item.variantId, lowStockThreshold: threshold },
            {
              onSuccess: () => {
                toast('Seuil enregistré');
                close();
              },
              onError: (error) => toast.error(errorMessage(error)),
            },
          );
        }}
      >
        <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
          <Switch checked={isCustom} onChange={setCustom} />
          <span className="flex flex-col">
            <span className="font-[600]">Seuil propre à cet article</span>
            <span className="text-[0.875rem] text-ink-2">Sinon, le seuil de la boutique s’applique : {storeDefault}.</span>
          </span>
        </label>
        {isCustom && (
          <Field label="Alerter sous">
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                className="tabular"
                value={current}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={setThreshold.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Historique des mouvements : le journal immuable de ce qui est entré et sorti. */
export function MovementsDialog({ item, onClose }: { item: InventoryItemDto | null; onClose: () => void }) {
  const movements = useMovements(item?.variantId ?? null);
  const rows = movements.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Historique du stock"
      description={item ? `${itemLabel(item)} · ${item.sku}` : undefined}
    >
      {movements.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : movements.error ? (
        <LoadError message={errorMessage(movements.error)} onRetry={() => void movements.refetch()} />
      ) : rows.length === 0 ? (
        <p className="text-ink-2">Aucun mouvement enregistré.</p>
      ) : (
        <ol className="-mx-2 flex flex-col">
          {rows.map((m) => (
            <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 rounded-lg px-2 py-2.5 odd:bg-surface-2/60">
              <span className="font-[600]">{MOVEMENT_LABELS[m.type]}</span>
              <span
                className={cn(
                  'tabular text-right font-[650]',
                  m.quantity < 0 ? 'text-danger-ink' : 'text-ink',
                )}
              >
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </span>
              <span className="truncate text-[0.8125rem] text-ink-2">
                {formatDateTime(m.createdAt)}
                {m.reason ? ` · ${m.reason}` : ''}
              </span>
              <span className="tabular text-right text-[0.8125rem] text-ink-2">reste {m.onHandAfter}</span>
            </li>
          ))}
        </ol>
      )}
      {movements.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={movements.isFetchingNextPage}
          onClick={() => void movements.fetchNextPage()}
        >
          Mouvements plus anciens
        </Button>
      )}
    </Dialog>
  );
}
