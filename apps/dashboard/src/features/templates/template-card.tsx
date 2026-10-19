import { type StoreType, styleLabel, type TemplateDefinition } from '@marche/contracts';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { Led } from '@/shared/ui/badge';
import { TemplateThumb } from './template-thumb';

/**
 * Un modèle dans la galerie : sa capture posée comme un écran (filet, coins de 0.7rem), son nom,
 * ses styles. Le modèle du site porte le témoin plein « Le vôtre » ; un modèle hors formule, un cadenas.
 * La capture partage son `layoutId` avec l'essai plein écran : elle grandit jusqu'à lui.
 */
export function TemplateCard({
  template,
  storeType,
  storeName,
  current,
  locked,
  layoutKey,
  opened,
  onOpen,
  eager = false,
  className,
}: {
  template: TemplateDefinition;
  storeType: StoreType;
  storeName: string;
  current: boolean;
  locked: boolean;
  /** Identifiant de transition, unique dans la page (un modèle peut paraître dans plusieurs rayons). */
  layoutKey: string;
  /** Ouvert en plein écran : la capture cède sa place (et son `layoutId`) à l'essai. */
  opened: boolean;
  onOpen: () => void;
  eager?: boolean;
  className?: string;
}) {
  const { name, styles, tier } = template.manifest;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Essayer « ${name} » sur votre boutique`}
      aria-description={[
        current ? 'Modèle de votre site.' : '',
        locked ? 'Réservé à Premium.' : tier === 'free' ? 'Gratuit.' : '',
        template.manifest.tagline,
      ]
        .filter(Boolean)
        .join(' ')}
      className={cn(
        'group flex w-full min-w-0 flex-col gap-2.5 rounded-[0.9rem] p-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className,
      )}
    >
      <motion.span
        layoutId={opened ? undefined : layoutKey}
        className="relative block overflow-hidden rounded-[0.7rem] shadow-[0_0_0_1px_var(--color-line)] transition-[box-shadow,translate] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1px_var(--color-line-strong),0_14px_28px_-18px_hsl(var(--shadow-color)/0.45)]"
        style={{ opacity: opened ? 0 : 1 }}
      >
        <TemplateThumb template={template} storeType={storeType} storeName={storeName} eager={eager} />
        {locked && (
          <span className="absolute top-2 right-2 inline-flex h-7 items-center gap-1.5 rounded-lg bg-key px-2 text-[0.75rem] font-[600] text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]">
            <Lock className="size-3" strokeWidth={2.2} aria-hidden />
            Premium
          </span>
        )}
      </motion.span>
      <span className="flex min-w-0 flex-col gap-0.5 px-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-[650]">{name}</span>
          {current && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.75rem] font-[560] text-ink-2">
              <Led tone="on" />
              Le vôtre
            </span>
          )}
        </span>
        <span className="truncate text-[0.8125rem] text-ink-2">
          {styles.map(styleLabel).join(' · ')}
          {tier === 'free' && ' · Gratuit'}
        </span>
      </span>
    </button>
  );
}
