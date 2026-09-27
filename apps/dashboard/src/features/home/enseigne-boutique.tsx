import type { ReportingOverviewDto, ReportingPeriod, SiteDto, StoreDto } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ArrowUpRight, Paintbrush } from 'lucide-react';
import emblemeTrait from '@/assets/brand/baobab-embleme-trait.png';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/button';
import { Chiffre } from '@/shared/ui/chiffre';
import { PlaqueAdresse } from '@/shared/ui/enseigne';
import { Skeleton } from '@/shared/ui/feedback';
import { Plaque } from '@/shared/ui/plaque';

const PERIODS: { value: ReportingPeriod; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
];

/**
 * L'enseigne de la boutique : son nom peint en grand, l'adresse du site vissée à droite,
 * et en bas le bandeau des trois chiffres du moment, chacun dans sa case.
 */
export function EnseigneBoutique({
  store,
  site,
  overview,
  period,
  onPeriodChange,
}: {
  store: StoreDto | undefined;
  site: SiteDto | null | undefined;
  overview: ReportingOverviewDto | undefined;
  period: ReportingPeriod;
  onPeriodChange: (period: ReportingPeriod) => void;
}) {
  const toShip = overview?.ordersToFulfill ?? 0;
  const lowStock = (overview?.lowStockCount ?? 0) + (overview?.outOfStockCount ?? 0);

  return (
    <section aria-label="Enseigne de la boutique" className="sur-vert enseigne overflow-hidden">
      <div className="flex flex-col gap-6 px-6 pt-8 pb-6 sm:px-10 sm:pt-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <img src={emblemeTrait} alt="" className="mt-1 hidden size-16 shrink-0 opacity-90 sm:block" />
          {store ? (
            <h1 className="lettrage text-[3rem] break-words sm:text-[4.5rem] lg:text-[5.25rem]">{store.name}</h1>
          ) : (
            <Skeleton className="h-16 w-72 bg-white/12 sm:h-20" />
          )}
        </div>
        <SitePlate site={site} />
      </div>

      <div className="grid grid-cols-2 border-t border-white/25 sm:grid-cols-[1.4fr_1fr_1fr]">
        <Case className="col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <CaseLabel>Ventes</CaseLabel>
            <div role="group" aria-label="Période" className="flex gap-0.5 rounded-md bg-black/15 p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={p.value === period}
                  onClick={() => onPeriodChange(p.value)}
                  className={cn(
                    'chiffres h-7 rounded-[5px] px-2 text-[0.75rem] font-bold transition-colors duration-150',
                    p.value === period ? 'bg-white text-baobab' : 'text-white/80 hover:text-white',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {overview ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <Chiffre value={formatAmount(overview.revenueAmount, overview.currency)} className="text-[2.75rem] sm:text-[3.5rem]" />
              <span className="titre text-[1.25rem] text-white/80">{currencyLabel(overview.currency)}</span>
            </p>
          ) : (
            <Skeleton className="h-12 w-44 bg-white/12" />
          )}
          <CaseNote>
            {overview ? `${overview.ordersCount} commande${overview.ordersCount > 1 ? 's' : ''} hors annulées` : ' '}
          </CaseNote>
        </Case>

        <Case className="border-t border-white/25 sm:border-t-0 sm:border-l">
          <CaseLabel>À expédier</CaseLabel>
          {overview ? (
            <Chiffre value={String(toShip)} className={cn('text-[2.75rem] sm:text-[3.5rem]', toShip > 0 && 'text-jaune')} />
          ) : (
            <Skeleton className="h-12 w-16 bg-white/12" />
          )}
          <CaseNote>{toShip > 0 ? 'en attente de départ' : 'rien en attente'}</CaseNote>
        </Case>

        <Case className="border-t border-l border-white/25 sm:border-t-0">
          <CaseLabel>Stock bas</CaseLabel>
          {overview ? (
            <Chiffre value={String(lowStock)} className="text-[2.75rem] sm:text-[3.5rem]" />
          ) : (
            <Skeleton className="h-12 w-16 bg-white/12" />
          )}
          <CaseNote>
            {overview && overview.outOfStockCount > 0
              ? `dont ${overview.outOfStockCount} en rupture`
              : 'articles sous le seuil'}
          </CaseNote>
        </Case>
      </div>
    </section>
  );
}

function SitePlate({ site }: { site: SiteDto | null | undefined }) {
  if (site === undefined) return <Skeleton className="h-10 w-56 bg-white/12" />;
  if (site === null) {
    return (
      <Link to="/site" className={buttonClasses('jaune', 'lg', 'self-start')}>
        <Paintbrush /> Mettre mon site en ligne
      </Link>
    );
  }
  const online = site.status === 'PUBLISHED';
  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <div className="flex items-center gap-2">
        <Plaque tone={online ? 'jaune' : 'contour-blanc'}>
          {online ? 'En ligne' : site.status === 'DRAFT' ? 'Brouillon' : 'Hors ligne'}
        </Plaque>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md no-underline transition-transform duration-150 hover:-translate-y-px"
        >
          <PlaqueAdresse host={new URL(site.url).host} />
        </a>
      </div>
      <Link to="/site" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-white/85 hover:text-white">
        Personnaliser le site <ArrowUpRight className="size-3.5" />
      </Link>
    </div>
  );
}

function Case({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 flex-col gap-2 px-6 py-5 sm:px-8 sm:py-6', className)}>{children}</div>;
}

function CaseLabel({ children }: { children: ReactNode }) {
  return <span className="text-[0.8125rem] font-[700] tracking-[0.04em] text-white/80 uppercase">{children}</span>;
}

function CaseNote({ children }: { children: ReactNode }) {
  return <span className="text-[0.8125rem] text-white/75">{children}</span>;
}
