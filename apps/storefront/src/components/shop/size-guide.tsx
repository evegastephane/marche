'use client';

import type { SizeGuide } from '@marche/contracts';
import { Ruler } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/format';
import { Sheet } from './sheet';

/** Tableau des mesures d'un guide des tailles ; la taille choisie est mise en avant. */
export function SizeGuideTable({ guide, highlight, className }: { guide: SizeGuide; highlight?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="tabular w-full border-collapse text-left text-sm">
          <caption className="sr-only">{guide.title}</caption>
          <thead>
            <tr>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="border-b-2 border-current px-2.5 py-2 font-semibold whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((cells, r) => {
              const active = highlight !== undefined && cells[0] === highlight;
              return (
                <tr key={r} aria-current={active ? 'true' : undefined} className={cn(active && 'bg-accent text-on-accent')}>
                  {cells.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row" className="border-b border-current/15 px-2.5 py-2 font-semibold">
                        {cell}
                      </th>
                    ) : (
                      <td key={c} className="border-b border-current/15 px-2.5 py-2">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {guide.note && <p className="text-sm opacity-80">{guide.note}</p>}
    </div>
  );
}

/** Lien « Guide des tailles » qui ouvre le tableau. */
export function SizeGuideButton({
  guide,
  highlight,
  className,
  sheetClassName,
  children,
}: {
  guide: SizeGuide;
  highlight?: string;
  className?: string;
  sheetClassName?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4', className)}
      >
        {children ?? (
          <>
            <Ruler className="size-4" aria-hidden /> Guide des tailles
          </>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={guide.title} className={sheetClassName}>
        <SizeGuideTable guide={guide} highlight={highlight} />
      </Sheet>
    </>
  );
}
