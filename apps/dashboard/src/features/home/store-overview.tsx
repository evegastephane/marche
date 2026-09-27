import type { ReportingOverviewDto, ReportingPeriod, SiteDto, StoreDto } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, type LucideIcon, Rocket, Truck, Warehouse } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge, IconBadge } from '@/shared/ui/badge';
import { UpsellMark } from '@/shared/ui/brand';
import { buttonClasses } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { riseIn, snappy, spring } from '@/shared/ui/motion';
import { SiteAddress } from '@/shared/ui/site-address';

const PERIODS: { value: ReportingPeriod; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
];

/**
 * En-tête de l'accueil : le nom de la boutique et l'état de son site,
 * puis les trois chiffres du moment qui défilent jusqu'à leur valeur.
 */
export function StoreOverview({
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
    <>
      <motion.header variants={riseIn} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="eyebrow">Tableau de bord</span>
          {store ? (
            <h1 className="display text-[2.25rem] break-words sm:text-[2.75rem]">{store.name}</h1>
          ) : (
            <Skeleton className="h-11 w-64" />
          )}
        </div>
        <SiteStatus site={site} />
      </motion.header>

      <motion.section
        variants={riseIn}
        aria-label="Chiffres du moment"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.5fr_1fr_1fr]"
      >
        <motion.div
          whileHover={{ y: -3 }}
          transition={spring}
          className="relative isolate flex min-h-[11.5rem] flex-col justify-between gap-4 overflow-hidden rounded-[1.25rem] bg-brand p-5 text-on-brand shadow-[0_18px_40px_-20px_var(--color-brand)] max-lg:col-span-2 sm:p-6"
        >
          <UpsellMark
            className="pointer-events-none absolute -right-6 -bottom-8 -z-10 h-40 w-auto opacity-[0.14]"
            mono="#ffffff"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] font-[700] text-white/80">Ventes</span>
            <PeriodSwitch value={period} onChange={onPeriodChange} />
          </div>
          {overview ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <AnimatedNumber
                value={overview.revenueAmount}
                format={(n) => formatAmount(Math.round(n), overview.currency)}
                className="display text-[2.75rem] sm:text-[3.25rem]"
              />
              <span className="text-[1.125rem] font-[700] text-white/75">{currencyLabel(overview.currency)}</span>
            </p>
          ) : (
            <Skeleton className="h-12 w-44 opacity-30" />
          )}
          <span className="text-[0.8125rem] text-white/75">
            {overview ? (
              <>
                <AnimatedNumber value={overview.ordersCount} /> commande
                {overview.ordersCount > 1 ? 's' : ''} hors annulées
              </>
            ) : (
              ' '
            )}
          </span>
        </motion.div>

        <Kpi
          icon={Truck}
          tone={toShip > 0 ? 'sun' : 'neutral'}
          label="À expédier"
          value={overview ? toShip : undefined}
          note={toShip > 0 ? 'en attente de départ' : 'rien en attente'}
          to="/orders"
        />
        <Kpi
          icon={Warehouse}
          tone={lowStock > 0 ? 'accent' : 'neutral'}
          label="Stock bas"
          value={overview ? lowStock : undefined}
          note={
            overview && overview.outOfStockCount > 0
              ? `dont ${overview.outOfStockCount} en rupture`
              : 'articles sous le seuil'
          }
        />
      </motion.section>
    </>
  );
}

function PeriodSwitch({ value, onChange }: { value: ReportingPeriod; onChange: (p: ReportingPeriod) => void }) {
  const group = useId();
  return (
    <div role="group" aria-label="Période" className="flex gap-0.5 rounded-full bg-black/15 p-0.5">
      {PERIODS.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p.value)}
            className={cn(
              'tabular relative h-7 rounded-full px-2.5 text-[0.75rem] font-bold transition-colors duration-200',
              active ? 'text-[#0c1a3c]' : 'text-white/80 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId={`period-${group}`}
                className="absolute inset-0 rounded-full bg-white"
                transition={snappy}
              />
            )}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  note,
  to,
}: {
  icon: LucideIcon;
  tone: 'sun' | 'accent' | 'neutral';
  label: string;
  value: number | undefined;
  note: ReactNode;
  to?: '/orders';
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-[700] text-ink-2">{label}</span>
        <IconBadge icon={icon} size="sm" tone={tone} />
      </div>
      {value === undefined ? (
        <Skeleton className="h-12 w-16" />
      ) : (
        <AnimatedNumber value={value} className="display text-[2.25rem] sm:text-[3.25rem]" />
      )}
      <span className="flex items-center justify-between gap-2 text-[0.8125rem] text-ink-2">
        {note}
        {to && (
          <ArrowUpRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </span>
    </>
  );
  const className =
    'card group flex min-h-[9.5rem] flex-col justify-between gap-3 p-5 text-ink no-underline sm:min-h-[11.5rem] sm:p-6';
  return (
    <motion.div whileHover={{ y: -3 }} transition={spring} className="rounded-[1.25rem]">
      {to ? (
        <Link to={to} search={{ filter: 'to-ship' }} className={cn(className, 'h-full rounded-[1.25rem]')}>
          {body}
        </Link>
      ) : (
        <div className={cn(className, 'h-full rounded-[1.25rem]')}>{body}</div>
      )}
    </motion.div>
  );
}

function SiteStatus({ site }: { site: SiteDto | null | undefined }) {
  if (site === undefined) return <Skeleton className="h-10 w-56" />;
  if (site === null) {
    return (
      <Link to="/site" className={buttonClasses('primary', 'md', 'self-start')}>
        <Rocket /> Mettre mon site en ligne
      </Link>
    );
  }
  const online = site.status === 'PUBLISHED';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={online ? 'success' : 'outline'}>
        {online ? 'En ligne' : site.status === 'DRAFT' ? 'Brouillon' : 'Hors ligne'}
      </Badge>
      <a
        href={site.url}
        target="_blank"
        rel="noreferrer"
        className="no-underline transition-transform hover:-translate-y-px"
      >
        <SiteAddress host={new URL(site.url).host} live={online} />
      </a>
      <Link
        to="/site"
        className="group inline-flex items-center gap-1 px-1 text-[0.8125rem] font-semibold text-brand-ink no-underline"
      >
        Personnaliser
        <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}
