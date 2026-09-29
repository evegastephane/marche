import { type PaletteColors, readableOn } from '@marche/contracts';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const SERIF = new Set(['Playfair Display', 'Lora']);

/** Pile de polices du croquis : la police du template si elle est installée, sinon une voisine du système. */
const STACKS = {
  condensed:
    "'Archivo Narrow', 'Archivo', 'Arial Narrow', 'Roboto Condensed', sans-serif-condensed, sans-serif",
  hand: "'Kalam', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive",
  barlow:
    "'Barlow Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif-condensed, sans-serif",
  marker: "'Permanent Marker', 'Segoe Print', 'Marker Felt', cursive",
  slab: "'Alfa Slab One', 'Rockwell Extra Bold', 'Rockwell', 'Roboto Slab', Georgia, serif",
  karla: "'Karla', ui-sans-serif, system-ui, sans-serif",
  wide: "'Anybody', 'Arial Black', 'Helvetica Neue', sans-serif",
  franklin: "'Libre Franklin', 'Franklin Gothic Medium', 'Arial', sans-serif",
  geist: "'Geist', ui-sans-serif, system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
  shoulders: "'Big Shoulders', 'Arial Narrow', 'Roboto Condensed', sans-serif-condensed, sans-serif",
  schibsted: "'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif",
  doto: "'Doto', ui-monospace, 'SFMono-Regular', monospace",
  atkinson: "'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif",
};

function family(font: string): string {
  return `'${font}', ${SERIF.has(font) ? 'Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'}`;
}

export interface SketchContent {
  storeName: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaLabel?: string;
  announcement?: string;
  /** Titres des rangées d'articles (catalogue mis en avant, grille). */
  shelves?: string[];
  /** Polices du template natif (les autres ont les leurs). */
  fonts?: { heading: string; body: string };
}

/**
 * Croquis d'un template dessiné avec les couleurs d'une palette : la même silhouette que le vrai site
 * (fronton, étagère de verre, cahier…), sans les photos. `thumb` pour la galerie, `full` pour l'aperçu.
 */
export function TemplateSketch({
  templateId,
  colors,
  content,
  size = 'full',
  className,
}: {
  templateId: string;
  colors: PaletteColors;
  content: SketchContent;
  size?: 'thumb' | 'full';
  className?: string;
}) {
  const thumb = size === 'thumb';
  const style: CSSProperties = {
    backgroundColor: colors.background,
    color: colors.foreground,
  };
  const Sketch = SKETCHES[templateId] ?? NativeSketch;
  return (
    <div
      aria-hidden={thumb || undefined}
      className={cn(
        'relative overflow-hidden transition-colors duration-300',
        className,
      )}
      style={style}
    >
      <Sketch colors={colors} content={content} thumb={thumb} />
    </div>
  );
}

interface SketchProps {
  colors: PaletteColors;
  content: SketchContent;
  thumb: boolean;
}

/** Rangée de vignettes d'articles, dans la forme propre au template. */
function Row({
  count,
  children,
}: {
  count: number;
  children: (index: number) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: count }, (_, i) => children(i))}
    </div>
  );
}

function NativeSketch({ colors, content, thumb }: SketchProps) {
  const heading = { fontFamily: family(content.fonts?.heading ?? 'DM Sans') };
  return (
    <div style={{ fontFamily: family(content.fonts?.body ?? 'Inter') }}>
      {!thumb && content.announcement && (
        <p
          className="px-4 py-1.5 text-center text-[0.6875rem] font-semibold"
          style={{
            background: colors.accent,
            color: readableOn(colors.accent),
          }}
        >
          {content.announcement}
        </p>
      )}
      <div
        className={cn(
          'flex items-center justify-between',
          thumb ? 'px-2.5 py-1.5' : 'px-4 py-3',
        )}
      >
        <span
          className={cn(
            'truncate font-bold',
            thumb ? 'text-[0.5625rem]' : 'text-[0.9375rem]',
          )}
          style={heading}
        >
          {content.storeName}
        </span>
        <span className="flex gap-1.5" aria-hidden>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={cn('rounded-full', thumb ? 'h-1 w-3' : 'h-1.5 w-6')}
              style={{ background: colors.muted }}
            />
          ))}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-col items-start',
          thumb ? 'gap-1 px-2.5 py-3' : 'gap-2 px-4 py-7',
        )}
        style={{
          background: colors.primary,
          color: readableOn(colors.primary),
        }}
      >
        <p
          className={cn(
            'leading-tight font-bold',
            thumb ? 'text-[0.625rem]' : 'text-[1.25rem]',
          )}
          style={heading}
        >
          {content.heroTitle || 'Bienvenue'}
        </p>
        {!thumb && content.heroSubtitle && (
          <p className="text-[0.6875rem] opacity-85">{content.heroSubtitle}</p>
        )}
        <span
          className={cn(
            'rounded-md font-bold',
            thumb ? 'mt-0.5 h-2 w-8' : 'mt-1 px-2.5 py-1 text-[0.6875rem]',
          )}
          style={{
            background: colors.accent,
            color: readableOn(colors.accent),
          }}
        >
          {!thumb && (content.ctaLabel || 'Découvrir')}
        </span>
      </div>
      {(thumb ? [''] : (content.shelves ?? ['Nouveautés'])).map((title, s) => (
        <div
          key={s}
          className={cn(
            'flex flex-col',
            thumb ? 'gap-1 px-2.5 py-2' : 'gap-2 px-4 py-4',
          )}
        >
          {!thumb && (
            <p className="text-[0.8125rem] font-bold" style={heading}>
              {title}
            </p>
          )}
          <Row count={4}>
            {(i) => (
              <div key={i} className="flex flex-col gap-1">
                <span
                  className="aspect-[4/5] rounded-[0.3rem]"
                  style={{
                    background: colors.surface,
                    boxShadow: `inset 0 0 0 1px ${colors.line}`,
                  }}
                />
                <span
                  className="h-1 w-3/4 rounded-full"
                  style={{ background: colors.muted, opacity: 0.6 }}
                />
              </div>
            )}
          </Row>
        </div>
      ))}
    </div>
  );
}

function AtelierSketch({ colors, content, thumb }: SketchProps) {
  const rule = thumb ? 9 : 18;
  const paper: CSSProperties = {
    backgroundImage: `linear-gradient(to right, transparent ${thumb ? 14 : 26}px, ${colors.primary}73 ${thumb ? 14 : 26}px, ${colors.primary}73 ${thumb ? 15 : 27}px, transparent ${thumb ? 15 : 27}px), repeating-linear-gradient(to bottom, transparent 0, transparent ${rule - 1}px, ${colors.line} ${rule - 1}px, ${colors.line} ${rule}px)`,
  };
  const condensed: CSSProperties = {
    fontFamily: STACKS.condensed,
    fontStretch: '75%',
  };
  return (
    <div
      className={cn('flex flex-col', thumb ? 'gap-2 pb-3' : 'gap-4 pb-6')}
      style={paper}
    >
      <div
        className={cn(
          'flex items-baseline justify-between border-b-2 border-double',
          thumb ? 'px-2.5 pt-1.5 pb-1' : 'px-4 pt-3 pb-2',
        )}
        style={{ borderColor: colors.line }}
      >
        <span
          className={cn(
            'truncate leading-none font-bold',
            thumb ? 'text-[0.6875rem]' : 'text-[1.25rem]',
          )}
          style={{ fontFamily: STACKS.hand, color: colors.accent }}
        >
          {content.storeName}
        </span>
        <span
          className={cn(
            'font-bold tracking-[0.08em] uppercase',
            thumb ? 'text-[0.375rem]' : 'text-[0.625rem]',
          )}
          style={condensed}
        >
          Panier
        </span>
      </div>
      <div
        className={cn(
          'grid grid-cols-[1.2fr_1fr] items-center',
          thumb ? 'gap-2 pr-2.5 pl-5' : 'gap-4 pr-4 pl-9',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p
            className={cn(
              'leading-[0.95] font-extrabold uppercase',
              thumb ? 'text-[0.75rem]' : 'text-[1.5rem]',
            )}
            style={condensed}
          >
            {content.heroTitle || 'La collection'}
          </p>
          {!thumb && content.heroSubtitle && (
            <p
              className="text-[0.75rem] leading-snug"
              style={{ fontFamily: STACKS.hand, color: colors.accent }}
            >
              {content.heroSubtitle}
            </p>
          )}
          <span
            className={cn(
              'font-bold tracking-[0.1em] uppercase',
              thumb
                ? 'mt-0.5 h-2.5 w-10'
                : 'mt-1 border-l-2 border-dashed px-3 py-1.5 text-[0.625rem]',
            )}
            style={{
              background: colors.primary,
              color: readableOn(colors.primary),
              borderColor: `${readableOn(colors.primary)}80`,
              ...condensed,
            }}
          >
            {!thumb && (content.ctaLabel || 'Voir les modèles')}
          </span>
        </div>
        <div
          className={cn('relative -rotate-2', thumb ? 'p-1' : 'p-2')}
          style={{
            background: colors.surface,
            boxShadow: '0 10px 18px -12px rgb(0 0 0 / 0.55)',
          }}
        >
          <span
            className={cn(
              'absolute left-1/2 -translate-x-1/2 -rotate-6',
              thumb ? '-top-1 h-2 w-6' : '-top-2 h-3.5 w-12',
            )}
            style={{ background: `${colors.muted}55` }}
          />
          <span
            className="block aspect-[4/5]"
            style={{ background: colors.background }}
          />
        </div>
      </div>
      {!thumb && (
        <div className="flex flex-col gap-2 pr-4 pl-9">
          <p
            className="text-[0.6875rem] font-bold tracking-[0.12em] uppercase"
            style={condensed}
          >
            {content.shelves?.[0] ?? 'Les modèles'}
          </p>
          <Row count={4}>
            {(i) => (
              <div
                key={i}
                className={cn('p-1', i % 2 ? 'rotate-2' : '-rotate-2')}
                style={{
                  background: colors.surface,
                  boxShadow: '0 6px 10px -8px rgb(0 0 0 / 0.5)',
                }}
              >
                <span
                  className="block aspect-[4/5]"
                  style={{ background: colors.background }}
                />
                <span
                  className="mt-1 block h-1 w-2/3 rounded-full"
                  style={{ background: colors.accent, opacity: 0.8 }}
                />
              </div>
            )}
          </Row>
        </div>
      )}
    </div>
  );
}

function PriceTag({
  colors,
  thumb,
  children,
}: {
  colors: PaletteColors;
  thumb: boolean;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center font-extrabold',
        thumb ? 'h-2 w-6 pl-1.5' : 'h-5 pr-2 pl-4 text-[0.625rem]',
      )}
      style={{
        background: colors.primary,
        color: readableOn(colors.primary),
        fontFamily: STACKS.barlow,
        clipPath: thumb
          ? 'polygon(0.25rem 0,100% 0,100% 100%,0.25rem 100%,0 50%)'
          : 'polygon(0.5rem 0,100% 0,100% 100%,0.5rem 100%,0 50%)',
      }}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-full',
          thumb ? 'left-0.5 size-0.5' : 'left-1.5 size-1',
        )}
        style={{ background: colors.background }}
      />
      {children}
    </span>
  );
}

function VitrineSketch({ colors, content, thumb }: SketchProps) {
  const barlow: CSSProperties = { fontFamily: STACKS.barlow };
  const shelf = (
    <div className="relative">
      <div
        className={cn(
          'grid grid-cols-4 items-end',
          thumb ? 'gap-1.5 px-2.5' : 'gap-3 px-4',
        )}
      >
        {[0.95, 0.7, 0.85, 0.6].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'w-[62%]',
                thumb ? 'rounded-[0.2rem]' : 'rounded-[0.4rem]',
              )}
              style={{
                height: `${(thumb ? 26 : 58) * h}px`,
                background: colors.surface,
                boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
              }}
            />
            {!thumb && <PriceTag colors={colors} thumb={thumb} />}
          </div>
        ))}
      </div>
      <span
        className={cn('mt-1 block', thumb ? 'h-1' : 'h-2')}
        style={{
          background: `linear-gradient(to bottom, ${colors.foreground}40, transparent)`,
          borderTop: `1px solid ${colors.foreground}66`,
        }}
      />
    </div>
  );
  return (
    <div
      className={cn('flex flex-col', thumb ? 'gap-2 pb-3' : 'gap-4 pb-6')}
      style={barlow}
    >
      {!thumb && content.announcement && (
        <p
          className="px-4 py-1 text-center text-[0.6875rem] font-bold uppercase"
          style={{
            background: colors.primary,
            color: readableOn(colors.primary),
          }}
        >
          {content.announcement}
        </p>
      )}
      <div
        className={cn(
          'flex items-center justify-between',
          thumb ? 'px-2.5 pt-1.5' : 'px-4 pt-3',
        )}
        style={{ borderColor: colors.line }}
      >
        <span
          className={cn(
            'truncate border font-extrabold uppercase',
            thumb
              ? 'rounded-[0.2rem] px-1 text-[0.5rem]'
              : 'rounded-md px-2 py-0.5 text-[0.9375rem]',
          )}
          style={{
            background: colors.surface,
            color: colors.surfaceForeground,
            borderColor: colors.line,
            boxShadow: `0 0 14px -6px ${colors.primary}`,
          }}
        >
          {content.storeName}
        </span>
        <PriceTag colors={colors} thumb={thumb}>
          {!thumb && '0'}
        </PriceTag>
      </div>
      <p
        className={cn(
          'leading-[0.9] font-extrabold uppercase',
          thumb ? 'px-2.5 text-[0.8125rem]' : 'px-4 text-[1.75rem]',
        )}
        style={{ textShadow: `0 0 18px ${colors.primary}66` }}
      >
        {content.heroTitle || 'Nouveautés'}
      </p>
      {shelf}
      {!thumb && (
        <div className="px-4">
          <span className="inline-flex -rotate-2">
            <PriceTag colors={colors} thumb={false}>
              <span className="text-[0.75rem] uppercase">
                {content.ctaLabel || 'Toute la vitrine'} →
              </span>
            </PriceTag>
          </span>
        </div>
      )}
    </div>
  );
}

function DevantureSketch({ colors, content, thumb }: SketchProps) {
  const slab: CSSProperties = { fontFamily: STACKS.slab };
  const frame = (inset: number): CSSProperties => ({
    background: colors.surface,
    color: colors.surfaceForeground,
    boxShadow: `inset 0 0 0 ${inset}px ${colors.line}, inset 0 0 0 ${inset * 2.3}px ${colors.surface}, inset 0 0 0 ${inset * 3}px ${colors.line}`,
  });
  const panel = (
    <div className={cn(thumb ? 'p-1' : 'p-2')} style={frame(thumb ? 1 : 2)}>
      <span
        className={cn('block aspect-[4/5]', thumb ? 'm-0.5' : 'm-1')}
        style={{
          background: colors.background,
          border: `1.5px solid ${colors.line}`,
        }}
      />
    </div>
  );
  return (
    <div
      className={cn(
        'flex flex-col',
        thumb ? 'gap-2 px-2.5 pt-2 pb-2.5' : 'gap-4 px-4 pt-4 pb-5',
      )}
      style={{ fontFamily: STACKS.karla }}
    >
      {!thumb && content.announcement && (
        <p
          className="-mx-4 -mt-4 mb-1 px-4 py-1 text-center text-[0.6875rem] uppercase"
          style={{
            ...slab,
            background: colors.primary,
            color: readableOn(colors.primary),
          }}
        >
          {content.announcement}
        </p>
      )}
      <div
        className={cn('text-center', thumb ? 'px-2 py-2' : 'px-4 py-5')}
        style={frame(thumb ? 1 : 2)}
      >
        <p
          className={cn(
            'leading-none uppercase',
            thumb ? 'text-[0.8125rem]' : 'text-[1.75rem]',
          )}
          style={{ ...slab, textShadow: `0.06em 0.06em 0 ${colors.accent}` }}
        >
          {content.storeName}
        </p>
        {!thumb && content.heroTitle && (
          <p className="mt-2 text-[0.6875rem] font-bold uppercase">
            {content.heroTitle}
          </p>
        )}
      </div>
      <div
        className={cn(
          'grid grid-cols-[1fr_auto_1fr] items-end',
          thumb ? 'gap-1.5' : 'gap-3',
        )}
      >
        {panel}
        <span
          className={cn(
            'flex items-center justify-center rounded-t-full uppercase',
            thumb ? 'h-10 w-6 border' : 'h-24 w-16 border-2 text-[0.625rem]',
          )}
          style={{
            ...slab,
            background: colors.primary,
            color: readableOn(colors.primary),
            borderColor: colors.line,
          }}
        >
          {!thumb && (content.ctaLabel || 'Entrer')}
        </span>
        {panel}
      </div>
      <div
        className={cn(
          'flex flex-wrap justify-center',
          thumb ? 'gap-1' : 'gap-2',
        )}
      >
        {['Vêtements', 'Téléphones', 'Accessoires'].map((label, i) => (
          <span
            key={label}
            className={cn(
              'uppercase',
              thumb
                ? 'h-2 w-7 border'
                : 'border-2 px-2 py-0.5 text-[0.5625rem]',
              i % 2 ? 'rotate-1' : '-rotate-1',
            )}
            style={{
              ...slab,
              background: colors.surface,
              color: colors.surfaceForeground,
              borderColor: colors.line,
            }}
          >
            {!thumb && label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PatronSketch({ colors, content, thumb }: SketchProps) {
  const wide: CSSProperties = { fontFamily: STACKS.wide, fontStretch: '125%' };
  const dashed = `${thumb ? 1 : 1.5}px dashed ${colors.foreground}`;
  return (
    <div
      className={cn('flex flex-col', thumb ? 'gap-2 pb-2.5' : 'gap-4 pb-6')}
      style={{ fontFamily: STACKS.franklin }}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          thumb ? 'px-2.5 py-1.5' : 'px-4 py-3',
        )}
        style={{
          borderBottom: `${thumb ? 3 : 5}px double ${colors.foreground}`,
        }}
      >
        <span
          className={cn(
            'truncate leading-none font-black uppercase',
            thumb ? 'text-[0.5625rem]' : 'text-[1rem]',
          )}
          style={wide}
        >
          {content.storeName}
        </span>
        <span
          className={cn(
            'border font-bold',
            thumb ? 'h-2 w-2.5' : 'px-1.5 text-[0.625rem]',
          )}
          style={{ borderColor: colors.foreground }}
        >
          {!thumb && '0'}
        </span>
      </div>
      <div
        className={cn(
          'grid grid-cols-[1fr_1fr] items-start',
          thumb ? 'gap-2 px-2.5' : 'gap-4 px-4',
        )}
      >
        <p
          className={cn(
            'leading-[0.86] font-black uppercase',
            thumb ? 'text-[0.75rem]' : 'text-[1.5rem]',
          )}
          style={wide}
        >
          {content.heroTitle || 'Les nouveaux modèles'}
        </p>
        <div className={cn('flex flex-col', thumb ? 'gap-1' : 'gap-2')}>
          <span
            className={cn('block aspect-[4/5]', thumb ? 'p-0.5' : 'p-1')}
            style={{ border: dashed }}
          >
            <span
              className="block size-full"
              style={{ background: colors.surface }}
            />
          </span>
          <span className="flex gap-1">
            {['A', 'B', 'C'].map((letter, i) => (
              <span
                key={letter}
                className={cn(
                  'inline-flex items-center justify-center rounded-full border font-black',
                  thumb ? 'size-2.5 text-[0.3rem]' : 'size-5 text-[0.5rem]',
                )}
                style={{
                  borderColor: i === 0 ? colors.primary : colors.foreground,
                  background: i === 0 ? colors.primary : 'transparent',
                  color:
                    i === 0 ? readableOn(colors.primary) : colors.foreground,
                }}
              >
                {!thumb && letter}
              </span>
            ))}
          </span>
        </div>
      </div>
      <div
        className={cn(thumb ? 'mx-2.5 space-y-0.5' : 'mx-4 space-y-1')}
        style={{ borderTop: `1px solid ${colors.foreground}` }}
      >
        {[0, 1, 2].map((row) => (
          <span
            key={row}
            className={cn('flex', thumb ? 'gap-1 pt-0.5' : 'gap-2 pt-1')}
          >
            {[0, 1, 2, 3].map((cell) => (
              <span
                key={cell}
                className={cn('flex-1 rounded-full', thumb ? 'h-0.5' : 'h-1')}
                style={{
                  background:
                    row === 1 && cell === 0 ? colors.primary : colors.muted,
                  opacity: row === 1 ? 1 : 0.45,
                }}
              />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function BoiteSketch({ colors, content, thumb }: SketchProps) {
  const depth = thumb ? 4 : 8;
  const box: CSSProperties = {
    background: colors.background,
    boxShadow: `inset 0 0 0 1px ${colors.foreground}22, ${depth}px -${depth}px 0 -1px ${colors.line}, 0 10px 16px -12px rgb(0 0 0 / 0.5)`,
  };
  return (
    <div
      className={cn('flex flex-col', thumb ? 'gap-2 pb-2.5' : 'gap-4 pb-6')}
      style={{ fontFamily: STACKS.geist }}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          thumb ? 'px-2.5 py-1.5' : 'px-4 py-3',
        )}
        style={{ borderBottom: `1px solid ${colors.line}` }}
      >
        <span
          className={cn(
            'truncate uppercase',
            thumb
              ? 'text-[0.5rem] tracking-[0.22em]'
              : 'text-[0.875rem] tracking-[0.3em]',
          )}
        >
          {content.storeName}
        </span>
        <span
          className={cn('border', thumb ? 'size-2' : 'size-4')}
          style={{ borderColor: colors.foreground }}
        />
      </div>
      <div
        className={cn(
          'grid grid-cols-[1.1fr_1fr] items-center',
          thumb ? 'gap-2 px-2.5 pt-1' : 'gap-4 px-4 pt-2',
        )}
      >
        <span
          className={cn(
            'flex aspect-[5/6] flex-col items-center justify-center',
            thumb ? 'p-1.5' : 'p-3',
          )}
          style={box}
        >
          <span
            className={cn('w-1/2 rounded-[0.35rem]', thumb ? 'h-3/5' : 'h-3/5')}
            style={{ background: colors.foreground, opacity: 0.85 }}
          />
        </span>
        <span
          className={cn(
            'flex flex-col border',
            thumb ? 'gap-1 p-1.5' : 'gap-2 p-3',
          )}
          style={{
            background: colors.surface,
            color: colors.surfaceForeground,
            borderColor: colors.line,
          }}
        >
          <span
            className={cn(
              'leading-none font-semibold',
              thumb ? 'text-[0.5625rem]' : 'text-[1.125rem]',
            )}
          >
            {content.heroTitle || 'Arrivages'}
          </span>
          {[true, false, false].map((checked, i) => (
            <span
              key={i}
              className={cn('flex items-center', thumb ? 'gap-1' : 'gap-2')}
            >
              <span
                className={cn('shrink-0 border', thumb ? 'size-1.5' : 'size-3')}
                style={{
                  borderColor: checked
                    ? colors.primary
                    : colors.surfaceForeground,
                  background: checked ? colors.primary : 'transparent',
                }}
              />
              <span
                className={cn('flex-1 rounded-full', thumb ? 'h-0.5' : 'h-1')}
                style={{ background: colors.surfaceForeground, opacity: 0.35 }}
              />
              <span
                className={cn('rounded-full', thumb ? 'h-0.5 w-2' : 'h-1 w-6')}
                style={{ background: colors.primary }}
              />
            </span>
          ))}
          <span
            className={cn('block', thumb ? 'mt-0.5 h-2' : 'mt-1 h-6')}
            style={{ background: colors.primary }}
          />
        </span>
      </div>
    </div>
  );
}

/** La une : l'aplat de couverture, le titre de magazine, la photo, les titres autour, le coin corné. */
function CouvertureSketch({ colors, content, thumb }: SketchProps) {
  const onCover = readableOn(colors.accent);
  const line = (w: string) => (
    <span className={cn('flex flex-col', thumb ? 'gap-0.5' : 'gap-1.5')}>
      <span className={cn('block', thumb ? 'h-1' : 'h-2.5')} style={{ width: w, background: onCover }} />
      <span className={cn('block', thumb ? 'h-1 w-1/2' : 'h-2.5 w-2/3')} style={{ background: onCover }} />
      <span
        className={cn('block', thumb ? 'h-1 w-1/3' : 'h-3 w-2/5')}
        style={{ background: colors.surface }}
      />
    </span>
  );
  const ear = thumb ? 22 : 56;
  return (
    <div
      className={cn('relative flex flex-col [container-type:inline-size]', thumb ? 'gap-1.5 px-2.5 pt-2 pb-7' : 'gap-3 px-4 pt-4 pb-16')}
      style={{ background: colors.accent, color: onCover, fontFamily: STACKS.schibsted }}
    >
      <span
        className="block overflow-hidden leading-[0.8] font-black whitespace-nowrap uppercase"
        style={{
          fontFamily: STACKS.shoulders,
          letterSpacing: '-0.02em',
          // Le titre de magazine prend toute la largeur de la une, comme sur le site.
          fontSize: `min(${thumb ? 1.5 : 3.75}rem, calc(100cqi / ${Math.max(content.storeName.length, 4) * 0.78}))`,
        }}
      >
        {content.storeName}
      </span>
      <span
        className={cn('block', thumb ? 'h-1' : 'h-2')}
        style={{ borderTop: `${thumb ? 1 : 2}px solid ${onCover}`, borderBottom: `${thumb ? 1 : 2}px solid ${onCover}` }}
      />
      <div className={cn('grid grid-cols-[1fr_1.2fr_1fr] items-start', thumb ? 'gap-1.5' : 'gap-4')}>
        <div className={cn('flex flex-col', thumb ? 'gap-1.5' : 'gap-4')}>
          <span
            className={cn('leading-[0.85] font-black uppercase', thumb ? 'text-[0.625rem]' : 'text-[1.625rem]')}
            style={{ fontFamily: STACKS.shoulders }}
          >
            {content.heroTitle || 'La nouvelle collection'}
          </span>
          {line('90%')}
        </div>
        <span className="relative block aspect-[4/5]" style={{ background: `${colors.foreground}33` }}>
          <span
            className={cn('absolute rounded-full', thumb ? '-top-1 -right-1 size-4' : '-top-3 -right-3 size-12')}
            style={{ background: colors.surface, transform: 'rotate(-9deg)' }}
          />
        </span>
        <div className={cn('flex flex-col', thumb ? 'gap-1.5' : 'gap-4')}>
          {line('85%')}
          {line('70%')}
        </div>
      </div>
      <span
        className="absolute right-0 bottom-0"
        style={{ width: ear, height: ear, background: `linear-gradient(135deg, ${colors.background} 50%, ${colors.surface} 50%)` }}
      />
    </div>
  );
}

/** La devanture le soir : l'enseigne LED, l'étal éclairé, le titre et le prix allumés. */
function EnseigneSketch({ colors, content, thumb }: SketchProps) {
  const glow: CSSProperties = { color: colors.primary, textShadow: `0 0 ${thumb ? 4 : 10}px ${colors.primary}99` };
  const dots: CSSProperties = {
    backgroundColor: '#00000055',
    backgroundImage: `radial-gradient(circle, ${colors.primary}33 ${thumb ? 0.6 : 1}px, transparent ${thumb ? 0.9 : 1.4}px)`,
    backgroundSize: thumb ? '3px 3px' : '5px 5px',
  };
  return (
    <div className={cn('flex flex-col', thumb ? 'gap-2 pb-3' : 'gap-4 pb-6')} style={{ fontFamily: STACKS.atkinson }}>
      <div
        className={cn('overflow-hidden font-extrabold whitespace-nowrap uppercase', thumb ? 'px-2 py-1 text-[0.625rem]' : 'px-4 py-2.5 text-[1.375rem]')}
        style={{ ...dots, ...glow, fontFamily: STACKS.doto, borderBottom: `1px solid ${colors.line}` }}
      >
        {content.storeName} · {content.shelves?.[0] || 'Téléphones'} · Garantie
      </div>
      <div className={cn('grid grid-cols-[1.05fr_1fr] items-center', thumb ? 'gap-2 px-2.5' : 'gap-5 px-4')}>
        <span
          className={cn('flex aspect-[5/4] items-center justify-center', thumb ? 'rounded-[3px]' : 'rounded-md')}
          style={{ background: colors.surface, boxShadow: `0 ${thumb ? 6 : 16}px ${thumb ? 10 : 24}px -${thumb ? 6 : 14}px ${colors.primary}88` }}
        >
          <span
            className={cn('h-[70%] w-[34%]', thumb ? 'rounded-[3px]' : 'rounded-lg')}
            style={{ background: colors.surfaceForeground, opacity: 0.85 }}
          />
        </span>
        <span className={cn('flex flex-col', thumb ? 'gap-1' : 'gap-2.5')}>
          <span
            className={cn('leading-[0.9] font-extrabold uppercase', thumb ? 'text-[0.8125rem]' : 'text-[2rem]')}
            style={{ ...glow, fontFamily: STACKS.doto }}
          >
            {content.heroTitle || 'Arrivages'}
          </span>
          <span
            className={cn('leading-none font-bold tracking-[0.04em] italic', thumb ? 'text-[0.6875rem]' : 'text-[1.75rem]')}
            style={{ ...glow, fontFamily: STACKS.mono }}
          >
            285 000
          </span>
          <span
            className={cn('block', thumb ? 'mt-0.5 h-2 w-3/5 rounded-[2px]' : 'mt-1 h-8 w-3/5 rounded-md')}
            style={{ background: colors.primary, boxShadow: `0 8px 18px -8px ${colors.primary}` }}
          />
        </span>
      </div>
    </div>
  );
}

const SKETCHES: Record<string, (props: SketchProps) => ReactNode> = {
  default: NativeSketch,
  atelier: AtelierSketch,
  patron: PatronSketch,
  vitrine: VitrineSketch,
  couverture: CouvertureSketch,
  boite: BoiteSketch,
  enseigne: EnseigneSketch,
  devanture: DevantureSketch,
};
