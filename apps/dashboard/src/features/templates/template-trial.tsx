import {
  canUseTemplate,
  FONT_CHOICES,
  resolvePalette,
  type SiteDto,
  type StoreDto,
  styleLabel,
  type TemplateDefinition,
  type ThemeSettings,
} from '@marche/contracts';
import { ArrowLeft, Crown, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { EASE_OUT, glide } from '@/shared/ui/motion';
import { LivePreview } from '../site/live-preview';
import { PublishBar } from '../site/publish-bar';
import { PalettePicker } from '../site/theme-picker';
import { switchTemplate } from '../site/theme-switch';
import type { ThemeDraft } from '../site/use-theme-draft';

/**
 * Essai plein écran : le modèle habille la vraie boutique (aperçu en direct, rien n'est enregistré),
 * ses palettes et ses polices à côté. La capture de la galerie grandit jusqu'ici (même `layoutId`).
 * Pour un autre modèle, la touche orange est « Utiliser ce modèle » ou « Passer à Premium » ;
 * pour le modèle du site, la barre Enregistrer / Publier.
 */
export function TemplateTrial({
  template,
  layoutId,
  site,
  store,
  draft,
  onClose,
  onUpgrade,
}: {
  template: TemplateDefinition;
  /** Capture de la galerie d'où part l'essai : elle grandit jusqu'à l'aperçu. Absente : simple ouverture. */
  layoutId?: string;
  site: SiteDto;
  store: StoreDto;
  draft: ThemeDraft;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const { id, name, tagline, styles, fontChoice, palettes } = template.manifest;
  const current = id === draft.settings.template;
  const allowed = canUseTemplate(store.plan, template.manifest);
  // Couleurs et polices d'un modèle essayé : à part tant qu'on ne le prend pas.
  const [trial, setTrial] = useState<Pick<ThemeSettings, 'palette' | 'fonts'> | null>(null);
  const shown: ThemeSettings = current ? draft.settings : { ...switchTemplate(draft.settings, id), ...trial };
  const palette = resolvePalette(shown);
  const back = useRef<HTMLButtonElement>(null);

  const setLook = (patch: Partial<Pick<ThemeSettings, 'palette' | 'fonts'>>) => {
    if (current) draft.edit((settings) => ({ ...settings, ...patch }));
    else setTrial({ palette: shown.palette, fonts: shown.fonts, ...patch });
  };

  const adopt = () => {
    draft.saveSettings(shown);
    setTrial(null);
    toast(`Modèle « ${name} » choisi`, { description: 'Publiez pour l’afficher sur votre site.' });
  };

  // Plein écran : la page dessous ne défile plus, Échap ramène à la galerie.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    back.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"][data-state="open"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="essai-titre"
      className="fixed inset-0 z-40 flex flex-col bg-canvas"
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <Button ref={back} variant="ghost" icon={<ArrowLeft strokeWidth={1.8} />} onClick={onClose}>
          Modèles
        </Button>
        <span aria-hidden className="h-6 w-px bg-line" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="essai-titre" className="heading truncate text-[1.0625rem]">
            {name}
          </h2>
          <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink-2">
            {current ? (
              <>
                <Led tone="on" /> Le modèle de votre site
              </>
            ) : allowed ? (
              <>
                <Led tone="attention" /> Essai sur votre boutique : rien n’est enregistré
              </>
            ) : (
              <>
                <Lock className="size-3 shrink-0" strokeWidth={2.2} aria-hidden /> Premium : essai libre, à utiliser avec la formule
              </>
            )}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-5 lg:flex-row lg:overflow-hidden">
        <motion.div
          layoutId={layoutId}
          transition={glide}
          className="flex min-h-[60vh] min-w-0 flex-1 flex-col lg:min-h-0"
        >
          <LivePreview settings={shown} host={new URL(site.url).host} fill />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.36, ease: EASE_OUT, delay: 0.12 } }}
          className="flex shrink-0 flex-col gap-4 lg:w-[22rem] lg:overflow-y-auto"
        >
          <section className="panel flex flex-col gap-3 p-5">
            <p className="text-[0.9375rem] leading-snug text-ink-2">{tagline}</p>
            <p className="text-[0.8125rem] text-ink-3">{styles.map(styleLabel).join(' · ')}</p>
          </section>

          <section className="panel flex flex-col gap-3 p-4" aria-labelledby="essai-couleurs">
            <h3 id="essai-couleurs" className="heading px-1 text-[1rem]">
              Couleurs
              <span className="ml-2 text-[0.8125rem] font-[500] text-ink-3">{palette.name}</span>
            </h3>
            <PalettePicker palettes={palettes} value={palette.id} onChange={(paletteId) => setLook({ palette: paletteId })} columns={4} />
            {fontChoice && (
              <div className="grid gap-3 px-1 pt-1">
                {(['heading', 'body'] as const).map((role) => (
                  <Field key={role} label={role === 'heading' ? 'Police des titres' : 'Police du texte'}>
                    {(props) => (
                      <Select
                        {...props}
                        value={shown.fonts[role]}
                        onChange={(e) =>
                          setLook({ fonts: { ...shown.fonts, [role]: e.target.value as (typeof FONT_CHOICES)[number] } })
                        }
                      >
                        {FONT_CHOICES.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                ))}
              </div>
            )}
          </section>

          {current ? (
            <PublishBar site={site} draft={draft} />
          ) : (
            <section className="panel flex flex-col gap-2 p-4">
              {allowed ? (
                <Button variant="primary" size="lg" loading={draft.busy === 'save'} disabled={draft.busy !== null} onClick={adopt}>
                  Utiliser ce modèle
                </Button>
              ) : (
                <Button variant="primary" size="lg" icon={<Crown strokeWidth={1.8} />} onClick={onUpgrade}>
                  Passer à Premium
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Revenir à la galerie
              </Button>
            </section>
          )}
        </motion.aside>
      </div>
    </motion.div>
  );
}
