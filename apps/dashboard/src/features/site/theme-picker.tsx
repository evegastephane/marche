import {
  type Palette,
  STORE_TYPE_LABELS,
  type StoreType,
  type TemplateDefinition,
  templatesFor,
} from '@marche/contracts';
import { Check, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { type CSSProperties, type KeyboardEvent, useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { glide } from '@/shared/ui/motion';
import { type SketchContent, TemplateSketch } from './template-sketch';

/** Flèches pour parcourir un groupe de boutons radio (le choix suit le focus, comme un vrai groupe radio). */
function useRovingRadios<T>(
  items: readonly T[],
  value: T,
  onChange: (item: T) => void,
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = items.indexOf(value);
    const next = (index + step + items.length) % items.length;
    onChange(items[next]!);
    refs.current[next]?.focus();
  };
  const bind = (index: number) => ({
    ref: (node: HTMLButtonElement | null) => {
      refs.current[index] = node;
    },
    onKeyDown,
  });
  return bind;
}

/** Types de boutique d'un modèle, en toutes lettres (« Mode », « Mode et électronique »). */
function fitLabel(template: TemplateDefinition): string {
  const types = template.manifest.storeTypes;
  return types.length > 1
    ? 'Mode et électronique'
    : STORE_TYPE_LABELS[types[0]!].label;
}

/**
 * Galerie des modèles de site : une seule grille de vignettes compactes (le croquis et le nom),
 * ceux pensés pour ce type de boutique d'abord. Sous la grille, l'afficheur décrit le modèle
 * survolé, ou à défaut le modèle choisi ; le choisi porte la face de touche et s'affiche en vrai
 * dans l'aperçu. Un modèle Premium hors formule porte un cadenas (on l'essaie quand même) ;
 * celui du site est marqué « Le vôtre ».
 */
export function TemplateGallery({
  storeType,
  value,
  onChange,
  content,
  currentId,
  locked = () => false,
}: {
  storeType: StoreType;
  value: string;
  onChange: (templateId: string) => void;
  content: SketchContent;
  /** Modèle du site, quand on en essaie un autre. */
  currentId?: string;
  locked?: (template: TemplateDefinition) => boolean;
}) {
  const group = useId();
  const { recommended, others } = templatesFor(storeType);
  const all = [...recommended, ...others];
  const ids = all.map((t) => t.manifest.id);
  const bind = useRovingRadios(ids, value, onChange);
  const [inspected, setInspected] = useState<string | null>(null);
  const shown =
    all.find((t) => t.manifest.id === (inspected ?? value)) ?? all[0]!;
  const shownIsActive = shown.manifest.id === value;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Modèle du site"
        className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4"
        onMouseLeave={() => setInspected(null)}
      >
        {all.map((template, index) => {
          const { id, name, palettes } = template.manifest;
          const active = id === value;
          return (
            <button
              key={id}
              {...bind(index)}
              type="button"
              role="radio"
              aria-checked={active}
              aria-description={`${template.manifest.tagline} ${fitLabel(template)}.${locked(template) ? ' Réservé à Premium.' : ''}${id === currentId ? ' Modèle de votre site.' : ''}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              onMouseEnter={() => setInspected(id)}
              onFocus={() => setInspected(id)}
              onBlur={() => setInspected(null)}
              className={cn(
                'group relative flex min-w-0 flex-col gap-2 rounded-xl p-1.5 pb-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                active ? 'text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`template-${group}`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                  transition={glide}
                />
              )}
              <span className="relative block overflow-hidden rounded-lg ring-1 ring-line">
                <TemplateSketch
                  templateId={id}
                  colors={palettes[0]!.colors}
                  content={content}
                  size="thumb"
                  className="aspect-[16/11] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                {locked(template) && (
                  <span className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]">
                    <Lock className="size-3" strokeWidth={2.2} aria-hidden />
                  </span>
                )}
              </span>
              <span className="relative flex items-start justify-between gap-1.5 px-1">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="line-clamp-2 text-[0.8125rem] leading-tight font-[650]">
                    {name}
                  </span>
                  {id === currentId && (
                    <span className="legend text-ink-3">Le vôtre</span>
                  )}
                </span>
                {active && (
                  <Check
                    className="mt-px size-3.5 shrink-0"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="display-window flex flex-col gap-1.5 rounded-xl px-4 py-3.5">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-[650]">{shown.manifest.name}</span>
          <span className="legend text-display-dim">
            {locked(shown) ? 'Premium · ' : ''}
            {shownIsActive ? 'Modèle affiché' : 'Cliquez pour l’essayer'}
          </span>
        </p>
        <p className="text-[0.875rem] leading-snug">{shown.manifest.tagline}</p>
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.75rem] text-display-dim">
          <span>
            {shown.manifest.palettes.length} palettes · {fitLabel(shown)}
          </span>
          <a
            href="#apercu"
            className="font-[600] text-display-ink underline underline-offset-4 lg:hidden"
          >
            Voir l’aperçu
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Palettes préréglées du modèle, en une seule rangée de touches (toutes visibles, sans case vide) :
 * chaque touche empile le fond et son texte, le panneau, l'action et l'accent. Au téléphone, la rangée défile.
 */
export function PalettePicker({
  palettes,
  value,
  onChange,
}: {
  palettes: readonly Palette[];
  value: string;
  onChange: (paletteId: string) => void;
}) {
  const group = useId();
  const ids = palettes.map((p) => p.id);
  const current = ids.includes(value) ? value : ids[0]!;
  const bind = useRovingRadios(ids, current, onChange);
  return (
    <div
      role="radiogroup"
      aria-label="Palette de couleurs"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:[grid-template-columns:repeat(var(--keys),minmax(0,1fr))]"
      style={{ '--keys': palettes.length } as CSSProperties}
    >
      {palettes.map((palette, index) => {
        const active = palette.id === current;
        const { background, surface, foreground, primary, accent } =
          palette.colors;
        return (
          <button
            key={palette.id}
            {...bind(index)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(palette.id)}
            className={cn(
              'relative flex w-[4.75rem] shrink-0 flex-col gap-2 rounded-lg p-1.5 pb-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`palette-${group}`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            <span
              aria-hidden
              className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-md ring-1 ring-line"
            >
              <span
                className="flex flex-[3] items-end p-1.5"
                style={{ background }}
              >
                <span
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ background: foreground }}
                />
              </span>
              <span className="flex-[1.2]" style={{ background: surface }} />
              <span className="flex-[1.4]" style={{ background: primary }} />
              <span className="flex-1" style={{ background: accent }} />
              {active && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong)]">
                  <Check className="size-3" strokeWidth={2.8} />
                </span>
              )}
            </span>
            <span className="relative line-clamp-2 px-0.5 text-[0.75rem] leading-tight font-[600] hyphens-auto [overflow-wrap:anywhere]">
              {palette.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
