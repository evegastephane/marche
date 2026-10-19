import { Check, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { ROOT_DOMAIN } from '@/lib/platform';
import { Swatch, type Wax } from './wax';

/*
 * Les vitrines de la rue des enseignes : dans chaque boutique, un petit étalage de ce que fait la fonction
 * (données d'exemple). Éteint, l'étalage reste dans la pénombre ; l'enseigne allumée l'éclaire.
 */

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[0.6875rem] font-[600] text-[var(--ul-ink-2)]">
      {children}
    </span>
  );
}

function Ticket({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5 rounded-lg bg-[#f4f1ea] px-3 py-2 text-[0.6875rem] leading-snug text-[#1d1c1a] shadow-[0_10px_20px_-12px_#000]">
      {children}
    </span>
  );
}

const DISPLAYS: Record<string, () => ReactNode> = {
  Catalogue: () => (
    <div className="flex items-end gap-2.5">
      {(['cercles', 'feuilles', 'losanges'] as Wax[]).map((wax, index) => (
        <span key={wax} className="flex flex-col items-center gap-1.5">
          <Swatch
            wax={wax}
            radius={10}
            className={index === 1 ? 'h-20 w-14' : 'h-16 w-12'}
          />
          <Label>{['S', 'M', 'L'][index]}</Label>
        </span>
      ))}
    </div>
  ),
  Stock: () => (
    <div className="flex items-end gap-3">
      <span className="text-[4.5rem] leading-[0.8] font-[250] tracking-[-0.04em] tabular-nums">
        6
      </span>
      <span className="flex flex-col gap-1 pb-1">
        <span className="text-[0.75rem] text-[var(--ul-ink-2)]">
          en main · taille M
        </span>
        <Label>1 réservée</Label>
      </span>
    </div>
  ),
  Appareils: () => (
    <span className="flex flex-col gap-2 rounded-lg bg-[#f4f1ea] px-3 py-2.5 text-[#1d1c1a]">
      <span className="flex h-7 items-stretch gap-[2px]">
        {[2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1].map(
          (width, index) => (
            <span
              key={index}
              className="bg-[#1d1c1a]"
              style={{ width: width * 1.5, opacity: index % 2 ? 0 : 1 }}
            />
          ),
        )}
      </span>
      <span className="ul-mono text-[0.6875rem] tabular-nums">
        IMEI 35 912640 187223 4
      </span>
    </span>
  ),
  Commandes: () => (
    <div className="relative h-24 w-48">
      <span className="absolute top-0 left-6 rotate-[5deg]">
        <Ticket>
          <b className="font-[700]">#1043 · Moussa Ba</b>
          30 000 FCFA · Payée
        </Ticket>
      </span>
      <span className="absolute top-8 left-0 -rotate-[3deg]">
        <Ticket>
          <b className="font-[700]">#1044 · Aïssatou Diop</b>
          18 000 FCFA · À expédier
        </Ticket>
      </span>
    </div>
  ),
  Demandes: () => (
    <div className="flex flex-col items-start gap-2">
      <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.08] px-3 py-2 text-[0.8125rem]">
        <MessageCircle className="size-3.5 shrink-0" strokeWidth={2} />
        Vous l’avez en pointure 42 ?
      </span>
      <span className="ml-6 rounded-2xl rounded-br-md bg-[#f5f1ea] px-3 py-2 text-[0.8125rem] font-[600] text-[#101115]">
        Offre : 25 000 FCFA
      </span>
    </div>
  ),
  Clients: () => (
    <div className="flex flex-col gap-2.5">
      <span className="flex -space-x-2">
        {['A', 'M', 'F', 'K'].map((initial, index) => (
          <span
            key={initial}
            className="grid size-9 place-items-center rounded-full text-[0.8125rem] font-[700] text-[#101115] ring-2 ring-[#0e0d10]"
            style={{
              background: ['#efe3cc', '#d9a441', '#f4f1ea', '#e7b04a'][index],
            }}
          >
            {initial}
          </span>
        ))}
      </span>
      <Label>
        <span className="inline-flex items-center gap-1">
          <Check className="size-3" strokeWidth={2.6} />
          Accepte vos messages
        </span>
      </Label>
    </div>
  ),
  Caisse: () => (
    <Ticket>
      <span className="ul-mono flex justify-between gap-6">
        <span>Robe wax · M</span>
        <span>18 000</span>
      </span>
      <span className="ul-mono flex justify-between gap-6">
        <span>Sac en raphia</span>
        <span>12 500</span>
      </span>
      <span className="ul-mono mt-1 flex justify-between gap-6 border-t border-dashed border-[#1d1c1a]/40 pt-1 font-[700]">
        <span>Total</span>
        <span>30 500</span>
      </span>
    </Ticket>
  ),
  Site: () => (
    <span className="flex w-44 flex-col gap-2 rounded-xl bg-[#fbfaf7] p-2 text-[#1b1a17]">
      <span className="truncate rounded-full bg-[#ecebe6] px-2 py-0.5 text-center text-[0.625rem] text-[#55534d]">
        chez-awa.{ROOT_DOMAIN}
      </span>
      <span className="grid grid-cols-2 gap-1.5">
        <Swatch wax="cercles" radius={8} className="aspect-square w-full" />
        <Swatch wax="raphia" radius={8} className="aspect-square w-full" />
      </span>
    </span>
  ),
  Campagnes: () => (
    <span className="flex max-w-[13rem] flex-col gap-1.5 rounded-2xl rounded-bl-md bg-white p-1.5 pb-2 text-[#1b1a17]">
      <Swatch wax="feuilles" radius={10} className="aspect-[16/9] w-full" />
      <span className="px-1 text-[0.75rem] leading-snug">
        Nouvelle collection wax : douze modèles.
      </span>
    </span>
  ),
  'Import Excel': () => (
    <span className="grid grid-cols-[2rem_repeat(3,3.25rem)] overflow-hidden rounded-md bg-[#f4f1ea] text-[0.625rem] text-[#1d1c1a]">
      {[
        '',
        'Nom',
        'Taille',
        'Prix',
        '11',
        'Robe',
        'M',
        '18 000',
        '12',
        'Sac',
        '—',
        '12 500',
      ].map((cell, index) => (
        <span
          key={index}
          className={`border-r border-b border-[#1d1c1a]/12 px-1.5 py-1 ${
            index < 4 ? 'font-[700]' : ''
          } ${index % 4 === 0 ? 'text-[#6b6962]' : ''}`}
        >
          {cell}
        </span>
      ))}
      <span className="col-span-4 flex items-center gap-1 px-1.5 py-1 font-[600]">
        <Check className="size-3" strokeWidth={2.6} />
        Lignes 11 et 12 vérifiées
      </span>
    </span>
  ),
  Équipe: () => (
    <div className="flex flex-wrap gap-1.5">
      {['Propriétaire', 'Admin', 'Équipe'].map((role) => (
        <Label key={role}>{role}</Label>
      ))}
      <span className="mt-1 w-full text-[0.75rem] text-[var(--ul-ink-3)]">
        Remise du vendeur plafonnée
      </span>
    </div>
  ),
  API: () => (
    <span className="ul-mono flex flex-col gap-1 rounded-lg bg-black/40 px-3 py-2.5 text-[0.6875rem] text-[var(--ul-ink-2)] ring-1 ring-white/[0.08]">
      <span>
        <b className="font-[700] text-[var(--ul-ink)]">GET</b>{' '}
        /storefront/v1/products
      </span>
      <span>
        <b className="font-[700] text-[var(--ul-ink)]">POST</b>{' '}
        /storefront/v1/checkout
      </span>
    </span>
  ),
};

/** L'étalage de la vitrine d'une fonction, s'il y en a un. */
export function WindowDisplay({ name }: { name: string }) {
  const display = DISPLAYS[name];
  return display ? (
    <div aria-hidden className="ul-display-case">
      {display()}
    </div>
  ) : null;
}
