import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { AnimatedNumber } from './animated-number';
import { riseIn } from './motion';

/**
 * Carte : surface blanche au filet fin. Posée dans un `Stagger`, elle monte à son tour
 * (elle porte la variante `riseIn`) ; seule, elle s'affiche simplement.
 */
export function Card({
  children,
  className,
  as = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside' | 'fieldset';
}) {
  const Component = motion[as];
  return (
    <Component variants={riseIn} className={cn('card', className)}>
      {children}
    </Component>
  );
}

/** Titre de carte, compteur facultatif, action à droite. */
export function CardHeader({
  title,
  count,
  actions,
  className,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <h2 className="heading flex items-center gap-2 text-[1.0625rem]">
        {title}
        {count !== undefined && (
          <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[0.75rem] font-bold text-ink-2">
            <AnimatedNumber value={count} />
          </span>
        )}
      </h2>
      {actions}
    </div>
  );
}
