import type { ReportingOverviewDto, ReportingPeriod, SiteDto, StoreDto } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Rocket } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Led } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';
import { SiteAddress } from '@/shared/ui/site-address';

const PERIODS: { value: ReportingPeriod; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
];

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** En-tête de l'accueil : le nom de la boutique, la date, et la fenêtre d'adresse du site. */
export function StoreHeader({
  store,
  site,
  lightSite,
}: {
  store: StoreDto | undefined;
  site: SiteDto | null | undefined;
  /** La touche orange de l'écran revient à la mise en ligne quand rien n'attend d'être expédié. */
  lightSite: boolean;
}) {
  return (
    <motion.header variants={riseIn} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {store ? (
          <h1 className="display text-[2rem] break-words sm:text-[2.5rem]">{store.name}</h1>
        ) : (
          <Skeleton className="h-10 w-64" />
        )}
        <p className="text-ink-2 first-letter:uppercase">{today.format(new Date())}</p>
      </div>
      <SiteStatus site={site} lit={lightSite} />
    </motion.header>
  );
}

/**
 * L'afficheur : fenêtre noire pleine largeur, trois lectures en colonnes fixes.
 * Les chiffres roulent à l'allumage puis à chaque changement de période.
 */
export function Afficheur({
  overview,
  period,
  onPeriodChange,
}: {
  overview: ReportingOverviewDto | undefined;
  period: ReportingPeriod;
  onPeriodChange: (period: ReportingPeriod) => void;
}) {
  const toShip = overview?.ordersToFulfill ?? 0;
  const lowStock = (overview?.lowStockCount ?? 0) + (overview?.outOfStockCount ?? 0);

  return (
    <motion.section
      variants={riseIn}
      aria-label="Afficheur"
      className="display-window grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-[1.7fr_1fr_1fr]"
    >
      <Reading
        className="col-span-2 border-b border-display-line lg:col-span-1 lg:border-r lg:border-b-0"
        label="Ventes"
        control={<PeriodSwitch value={period} onChange={onPeriodChange} />}
        value={
          overview ? (
            <span className="flex flex-wrap items-baseline gap-x-2.5">
              <AnimatedNumber
                value={overview.revenueAmount}
                format={(n) => formatAmount(Math.round(n), overview.currency)}
                className="readout text-[2.75rem] sm:text-[3.5rem]"
              />
              <span className="text-[1rem] font-[500] text-display-dim">{currencyLabel(overview.currency)}</span>
            </span>
          ) : undefined
        }
        note={
          overview ? (
            <>
              {overview.ordersCount} commande{overview.ordersCount > 1 ? 's' : ''} hors annulées
            </>
          ) : null
        }
      />
      <Reading
        className="border-r border-display-line"
        label="À expédier"
        led={toShip > 0}
        to="/orders"
        value={overview ? <AnimatedNumber value={toShip} className="readout text-[2.75rem] sm:text-[3.5rem]" /> : undefined}
        note={toShip > 0 ? 'en attente de départ' : 'rien en attente'}
      />
      <Reading
        label="Stock bas"
        value={overview ? <AnimatedNumber value={lowStock} className="readout text-[2.75rem] sm:text-[3.5rem]" /> : undefined}
        note={
          overview && overview.outOfStockCount > 0
            ? `dont ${overview.outOfStockCount} en rupture`
            : 'articles sous le seuil'
        }
      />
    </motion.section>
  );
}

function Reading({
  label,
  control,
  led = false,
  value,
  note,
  to,
  className,
}: {
  label: string;
  control?: ReactNode;
  led?: boolean;
  value: ReactNode | undefined;
  note: ReactNode;
  to?: '/orders';
  className?: string;
}) {
  const body = (
    <>
      <span className="flex min-h-8 items-center justify-between gap-3">
        <span className="legend flex items-center gap-2 text-display-dim">
          {label}
          {led && <Led tone="attention" pulse />}
        </span>
        {control}
        {to && (
          <ArrowUpRight
            className="size-4 text-display-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-display-ink"
            strokeWidth={1.8}
            aria-hidden
          />
        )}
      </span>
      {value ?? <Skeleton className="h-12 w-28 opacity-40" />}
      <span className="text-[0.8125rem] text-display-dim">{note}</span>
    </>
  );
  const box = cn('flex min-h-[10.5rem] flex-col justify-between gap-4 p-5 sm:p-6', className);
  if (!to) return <div className={box}>{body}</div>;
  return (
    <Link
      to={to}
      search={{ filter: 'to-ship' }}
      className={cn(box, 'group text-display-ink no-underline transition-colors duration-200 hover:bg-display-ink/[0.04]')}
    >
      {body}
    </Link>
  );
}

/** Commutateur de période posé dans l'afficheur : le curseur glisse d'un cran à l'autre. */
function PeriodSwitch({ value, onChange }: { value: ReportingPeriod; onChange: (p: ReportingPeriod) => void }) {
  const group = useId();
  return (
    <div
      role="group"
      aria-label="Période"
      className="flex gap-0.5 rounded-lg p-0.5 shadow-[inset_0_0_0_1px_var(--color-display-line)]"
    >
      {PERIODS.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p.value)}
            className={cn(
              'tabular relative h-7 rounded-md px-2.5 text-[0.75rem] font-[560] transition-colors duration-200 max-md:h-9 max-md:px-3',
              active ? 'text-ink' : 'text-display-dim hover:text-display-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`period-${group}`}
                className="absolute inset-0 rounded-md bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SiteStatus({ site, lit }: { site: SiteDto | null | undefined; lit: boolean }) {
  if (site === undefined) return <Skeleton className="h-9 w-56" />;
  if (site === null) {
    return (
      <Link to="/site" className={buttonClasses(lit ? 'primary' : 'secondary', 'md', 'self-start')}>
        <Rocket strokeWidth={1.8} /> Mettre mon site en ligne
      </Link>
    );
  }
  const online = site.status === 'PUBLISHED';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={site.url}
        target="_blank"
        rel="noreferrer"
        className="max-w-full no-underline transition-transform duration-200 hover:-translate-y-px"
        aria-label={`Ouvrir le site ${new URL(site.url).host}`}
      >
        <SiteAddress host={new URL(site.url).host} live={online} />
      </a>
      <Link to="/site" className={buttonClasses('ghost', 'md')}>
        {online ? 'Personnaliser' : 'Remettre en ligne'}
      </Link>
    </div>
  );
}
