import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { AnimatedNumber } from './animated-number';
import { riseIn } from './motion';

/**
 * Face de l'instrument : surface plane au filet fin. Posée dans un `Stagger`, elle monte à son tour
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
    <Component variants={riseIn} className={cn('panel', className)}>
      {children}
    </Component>
  );
}

/** Titre de face, compteur facultatif (chiffres qui roulent), action à droite. */
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
    <div className={cn('flex min-h-14 items-center justify-between gap-4 px-5 pt-4 pb-3', className)}>
      <h2 className="heading flex items-center gap-2.5 text-[1rem]">
        {title}
        {count !== undefined && (
          <span className="tabular text-[0.875rem] font-[500] text-ink-3">
            <AnimatedNumber value={count} />
          </span>
        )}
      </h2>
      {actions}
    </div>
  );
}
