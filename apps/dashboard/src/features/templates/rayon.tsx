import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { riseIn } from '@/shared/ui/motion';

/**
 * Un rayon de la galerie : son titre et son compte, « Voir tout », puis les modèles sur une étagère
 * qui glisse cran par cran (défilement aimanté, touches précédent / suivant à la souris, doigt au téléphone).
 */
export function Rayon({
  title,
  count,
  onSeeAll,
  children,
}: {
  title: string;
  count: number;
  onSeeAll?: () => void;
  children: ReactNode;
}) {
  const shelf = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = shelf.current;
    if (!node) return;
    setEdges({ start: node.scrollLeft <= 4, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const node = shelf.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  const step = (direction: 1 | -1) => {
    const node = shelf.current;
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
  };

  const arrow =
    'inline-flex size-9 items-center justify-center rounded-[0.6rem] bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-35 active:translate-y-px max-md:hidden';

  return (
    <motion.section variants={riseIn} aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <h2 className="heading flex items-baseline gap-2.5 text-[1.0625rem]">
          {title}
          <span className="tabular text-[0.875rem] font-[500] text-ink-3">{count}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          {onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              className="group mr-1 inline-flex min-h-9 items-center gap-1 text-[0.8125rem] font-[560] text-ink-2 hover:text-ink"
            >
              Voir tout
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden />
            </button>
          )}
          <button type="button" className={arrow} disabled={edges.start} onClick={() => step(-1)} aria-label={`${title} : précédents`}>
            <ChevronLeft className="size-4" strokeWidth={1.9} />
          </button>
          <button type="button" className={arrow} disabled={edges.end} onClick={() => step(1)} aria-label={`${title} : suivants`}>
            <ChevronRight className="size-4" strokeWidth={1.9} />
          </button>
        </div>
      </div>
      <ul
        ref={shelf}
        onScroll={measure}
        className={cn(
          'well -mx-1 flex snap-x snap-mandatory scroll-px-2 gap-2 overflow-x-auto rounded-2xl p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {children}
      </ul>
    </motion.section>
  );
}

/** Place d'un modèle sur l'étagère : une capture et demie au téléphone, quatre à l'ordinateur. */
export function RayonItem({ children }: { children: ReactNode }) {
  return <li className="w-[min(68vw,17rem)] shrink-0 snap-start sm:w-[16rem] xl:w-[calc((100%-1.5rem)/4)]">{children}</li>;
}
