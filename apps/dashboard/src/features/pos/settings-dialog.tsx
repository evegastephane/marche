import { DEFAULT_MOBILE_MONEY_PROVIDERS, type PosSettings, type ReceiptWidth } from '@marche/contracts';
import { Plus, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Field, Input, InputWithSuffix, Textarea } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import { useUpdatePosSettings } from './api';

/** Réglages de la caisse, par un administrateur : ce que les vendeurs peuvent faire, ce qu'on accepte, le ticket. */
export function PosSettingsDialog({ open, onOpenChange, settings }: { open: boolean; onOpenChange: (open: boolean) => void; settings: PosSettings }) {
  const update = useUpdatePosSettings();
  const [draft, setDraft] = useState(settings);
  const [maxPercent, setMaxPercent] = useState(String(settings.staffDiscountMaxPercent));
  const [newProvider, setNewProvider] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setMaxPercent(String(settings.staffDiscountMaxPercent));
      setNewProvider('');
    }
  }, [open, settings]);

  const percent = /^\d{1,3}$/.test(maxPercent.trim()) ? Number(maxPercent.trim()) : null;
  const providers = [...new Set([...DEFAULT_MOBILE_MONEY_PROVIDERS, ...draft.mobileMoneyProviders])];
  const toggleProvider = (provider: string) =>
    setDraft((prev) => ({
      ...prev,
      mobileMoneyProviders: prev.mobileMoneyProviders.includes(provider)
        ? prev.mobileMoneyProviders.filter((value) => value !== provider)
        : [...prev.mobileMoneyProviders, provider],
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (percent === null || percent > 100) return;
    update.mutate(
      { ...draft, staffDiscountMaxPercent: percent, receiptFooter: draft.receiptFooter.trim() },
      {
        onSuccess: () => {
          toast('Réglages de la caisse enregistrés');
          onOpenChange(false);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Réglages de la caisse">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field
          label="Remise maximale d’un vendeur"
          hint="Au-delà, un administrateur doit accorder la remise. 0 : aucune remise sans administrateur."
          error={percent === null || percent > 100 ? 'Un pourcentage entre 0 et 100.' : undefined}
        >
          {(props) => <InputWithSuffix {...props} inputMode="numeric" value={maxPercent} onChange={(e) => setMaxPercent(e.target.value)} suffix="%" />}
        </Field>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1.5 text-[0.8125rem] font-[600]">Mobile Money accepté</legend>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => {
              const on = draft.mobileMoneyProviders.includes(provider);
              return (
                <button
                  key={provider}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleProvider(provider)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-[600] transition-colors max-md:h-10',
                    on ? 'bg-ink text-canvas' : 'well text-ink-2 hover:text-ink',
                  )}
                >
                  {on ? <X className="size-3.5" strokeWidth={2} aria-hidden /> : <Plus className="size-3.5" strokeWidth={2} aria-hidden />}
                  {provider}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input aria-label="Autre opérateur" placeholder="Autre opérateur" maxLength={40} value={newProvider} onChange={(e) => setNewProvider(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!newProvider.trim()}
              onClick={() => {
                const name = newProvider.trim();
                if (!draft.mobileMoneyProviders.includes(name)) setDraft((prev) => ({ ...prev, mobileMoneyProviders: [...prev.mobileMoneyProviders, name] }));
                setNewProvider('');
              }}
            >
              Ajouter
            </Button>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          {(
            [
              ['acceptCard', 'Carte bancaire', 'Un terminal de paiement est au comptoir.'],
              ['acceptBankTransfer', 'Virement', 'Pour les achats importants, réglés par virement.'],
            ] as const
          ).map(([key, title, hint]) => (
            <label key={key} className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
              <Switch checked={draft[key]} onChange={(checked) => setDraft((prev) => ({ ...prev, [key]: checked }))} />
              <span className="flex flex-col">
                <span className="font-[600]">{title}</span>
                <span className="text-[0.875rem] text-ink-2">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-[600]">Largeur du rouleau</span>
          <Tabs<ReceiptWidth>
            label="Largeur du rouleau"
            value={draft.receiptWidth}
            onChange={(receiptWidth) => setDraft((prev) => ({ ...prev, receiptWidth }))}
            items={[
              { value: '58', label: '58 mm' },
              { value: '80', label: '80 mm' },
            ]}
            className="self-start"
          />
        </div>
        <Field label="Pied du ticket" hint="Conditions de retour, horaires, remerciement…">
          {(props) => (
            <Textarea
              {...props}
              className="min-h-20"
              maxLength={300}
              value={draft.receiptFooter}
              onChange={(e) => setDraft((prev) => ({ ...prev, receiptFooter: e.target.value }))}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={update.isPending} disabled={percent === null || percent > 100}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
