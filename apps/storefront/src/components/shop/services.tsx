'use client';

import { DEVICE_KINDS, FASHION_KINDS, type StorefrontProductDto, type StorefrontServicesDto } from '@marche/contracts';
import { Repeat, ScanLine, ShieldCheck, Undo2 } from 'lucide-react';
import { createContext, type ReactNode, useContext } from 'react';
import { cn } from '@/lib/format';
import { conditionHint } from '@/lib/product';
import { type RequestDetailField, SpecialRequestButton } from './special-request';

const ServicesContext = createContext<StorefrontServicesDto | null>(null);

/** Services de la boutique (réglages Mode ou Tech), posés une fois par le layout du site. */
export function ServicesProvider({ value, children }: { value: StorefrontServicesDto | null; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): StorefrontServicesDto | null {
  return useContext(ServicesContext);
}

/** Explication d'un état (Neuf, Reconditionné…) : celle écrite par la boutique, sinon celle par défaut. */
export function useConditionHint(): (value: string) => string | undefined {
  const services = useServices();
  return (value) => services?.conditions.find((c) => c.value === value)?.description || conditionHint(value);
}

const TRADE_IN_FIELDS: RequestDetailField[] = [
  { name: 'Modèle', placeholder: 'iPhone 11, Galaxy A32…' },
  { name: 'Stockage', placeholder: '128 Go' },
  { name: 'État', choices: ['Comme neuf', 'Traces d’usage', 'Écran fêlé', 'Ne s’allume plus'] },
];

export interface ServicesSkin {
  /** Liste des engagements (garantie, retours…). */
  list?: string;
  item?: string;
  /** Détail sous un engagement. */
  detail?: string;
  /** Boutons « reprise » et « sur mesure ». */
  button?: string;
  sheet?: string;
}

/**
 * Engagements et services de la boutique sur la fiche d'un produit, selon sa sorte :
 * garantie, retours, IMEI et reprise pour un appareil ; échange de taille et sur mesure pour la mode.
 * Chaque template l'habille par un « skin ».
 */
export function ServiceNotes({
  product,
  selection,
  skin = {},
  omit = [],
}: {
  product: StorefrontProductDto;
  selection: string[];
  skin?: ServicesSkin;
  /** Engagements que le template montre déjà à sa façon (le sceau de garantie de la boîte…). */
  omit?: 'warranty'[];
}) {
  const services = useServices();
  if (!services || !product.kind) return null;
  const device = DEVICE_KINDS.includes(product.kind);
  const fashion = (FASHION_KINDS as readonly string[]).includes(product.kind);
  const accessory = product.kind === 'ACCESSORY';
  const warrantyMonths =
    typeof product.attributes.warrantyMonths === 'number' ? product.attributes.warrantyMonths : (device ? services.warranty?.defaultMonths : undefined);

  const notes: { key: string; icon: typeof ShieldCheck; text: string; detail?: string }[] = [];
  if ((device || accessory) && warrantyMonths && !omit.includes('warranty')) {
    notes.push({ key: 'warranty', icon: ShieldCheck, text: `Garantie ${warrantyMonths} mois`, detail: services.warranty?.terms || undefined });
  }
  if ((device || accessory) && services.returns) {
    const detail = [services.returns.conditions, services.returns.afterSalesContact && `SAV : ${services.returns.afterSalesContact}`].filter(Boolean).join(' ');
    notes.push({ key: 'returns', icon: Undo2, text: `Retour sous ${services.returns.days} jours`, detail: detail || undefined });
  }
  if (device && services.serialNumbers) {
    notes.push({ key: 'serial', icon: ScanLine, text: 'IMEI ou numéro de série noté sur votre commande', detail: 'Gardez-le : il sert pour la garantie.' });
  }
  if (fashion && services.sizeExchange) {
    notes.push({ key: 'exchange', icon: Repeat, text: `Échange de taille sous ${services.sizeExchange.days} jours`, detail: services.sizeExchange.conditions || undefined });
  }
  const tradeIn = device && services.tradeIn;
  const measure = fashion && product.kind !== 'FASHION_ACCESSORY' && services.madeToMeasure;
  if (notes.length === 0 && !tradeIn && !measure) return null;

  return (
    <div className="flex flex-col gap-4">
      {notes.length > 0 && (
        <ul className={cn('flex flex-col gap-3', skin.list)}>
          {notes.map((note) => (
            <li key={note.key} className={cn('flex items-start gap-3', skin.item)}>
              <note.icon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{note.text}</span>
                {note.detail && <span className={cn('text-sm opacity-80', skin.detail)}>{note.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {tradeIn && (
        <SpecialRequestButton
          type="TRADE_IN"
          label="Faire reprendre mon ancien appareil"
          intro={tradeIn.text}
          details={TRADE_IN_FIELDS}
          productSlug={product.slug}
          productTitle={product.title}
          options={product.options}
          selection={selection}
          className={cn('inline-flex min-h-12 items-center justify-center self-start px-5 font-semibold', skin.button)}
          sheetClassName={skin.sheet}
        />
      )}
      {measure && (
        <SpecialRequestButton
          type="MADE_TO_MEASURE"
          label="Commander sur mesure"
          intro={`Confection sous ${measure.leadTimeDays} jours${measure.depositPercent > 0 ? `, acompte de ${measure.depositPercent} % à la commande` : ''}. La boutique vous répond avec le prix.`}
          details={measure.measurements.map((name) => ({ name, unit: 'cm', numeric: true }))}
          productSlug={product.slug}
          productTitle={product.title}
          options={product.options}
          selection={selection}
          className={cn('inline-flex min-h-12 items-center justify-center self-start px-5 font-semibold', skin.button)}
          sheetClassName={skin.sheet}
        />
      )}
    </div>
  );
}

/** Au panier : ce qui rassure avant de commander (échange de taille, retours), sans détail produit. */
export function CartServices({ className }: { className?: string }) {
  const services = useServices();
  if (!services) return null;
  const lines = [
    services.sizeExchange && `Échange de taille sous ${services.sizeExchange.days} jours.`,
    services.returns && `Retour sous ${services.returns.days} jours.${services.returns.afterSalesContact ? ` SAV : ${services.returns.afterSalesContact}` : ''}`,
    services.warranty && services.warranty.defaultMonths > 0 && `Appareils garantis ${services.warranty.defaultMonths} mois.`,
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return <p className={cn('text-sm opacity-80', className)}>{lines.join(' ')}</p>;
}
