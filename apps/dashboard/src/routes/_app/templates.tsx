import {
  canUseTemplate,
  FONT_CHOICES,
  getTemplate,
  resolvePalette,
  type SiteDto,
  type StoreDto,
  TEMPLATE_LIST,
  type ThemeSettings,
} from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Crown, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { LivePreview } from '@/features/site/live-preview';
import { PublishBar } from '@/features/site/publish-bar';
import { PalettePicker, TemplateGallery } from '@/features/site/theme-picker';
import { switchTemplate } from '@/features/site/theme-switch';
import { UnsavedGuard } from '@/features/site/unsaved-guard';
import { useThemeDraft } from '@/features/site/use-theme-draft';
import { errorMessage } from '@/shared/api/client';
import { Led } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Select } from '@/shared/ui/field';
import { EASE_OUT, riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/templates')({ component: ModelesPage });

/** Adresse de l'équipe pour activer Premium, tant que le paiement en ligne n'existe pas (rien si absente). */
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || null;
const PREMIUM_COUNT = TEMPLATE_LIST.filter((t) => t.manifest.tier === 'premium').length;

function ModelesPage() {
  const site = useSite();
  const store = useCurrentStore();

  if (site.isPending || store.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (site.error) return <LoadError message={errorMessage(site.error)} onRetry={() => void site.refetch()} />;
  if (!store.data) return null;
  if (!site.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Modèles" />
        <Card>
          <EmptyState icon={Crown} title="Votre site n’est pas encore en ligne">
            Mettez-le en ligne depuis{' '}
            <Link to="/site" className="font-[600] text-ink underline underline-offset-4">
              Site
            </Link>{' '}
            : vous choisirez ensuite son apparence ici.
          </EmptyState>
        </Card>
      </div>
    );
  }
  return <ModelesEditor site={site.data} store={store.data} />;
}

function ModelesEditor({ site, store }: { site: SiteDto; store: StoreDto }) {
  const draft = useThemeDraft(site);
  const current = draft.settings.template;
  // Le modèle essayé dans l'aperçu ; ses couleurs et polices restent à part tant qu'on ne le prend pas.
  const [trying, setTrying] = useState(current);
  const [trial, setTrial] = useState<Pick<ThemeSettings, 'palette' | 'fonts'> | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const host = new URL(site.url).host;
  const premium = store.plan === 'PREMIUM';

  const isCurrent = trying === current;
  const template = getTemplate(trying) ?? getTemplate('default')!;
  const allowed = canUseTemplate(store.plan, template.manifest);
  const shown: ThemeSettings = isCurrent ? draft.settings : { ...switchTemplate(draft.settings, trying), ...trial };
  const palette = resolvePalette(shown);

  const tryTemplate = (id: string) => {
    setTrying(id);
    setTrial(null);
  };
  const setLook = (patch: Partial<Pick<ThemeSettings, 'palette' | 'fonts'>>) => {
    if (isCurrent) draft.edit((settings) => ({ ...settings, ...patch }));
    else setTrial({ palette: shown.palette, fonts: shown.fonts, ...patch });
  };
  const adopt = () => {
    draft.saveSettings(shown);
    setTrial(null);
    toast(`Modèle « ${template.manifest.name} » choisi`, { description: 'Publiez pour l’afficher sur votre site.' });
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Modèles"
        subtitle="L’apparence de votre site. Vos sections restent les mêmes dans chaque modèle : essayez-les sur votre vraie boutique."
      />

      <motion.section
        variants={riseIn}
        className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="well inline-flex size-10 shrink-0 items-center justify-center rounded-[0.7rem] text-ink-2">
            <Crown className="size-[1.125rem]" strokeWidth={1.8} aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="flex items-center gap-2 font-[600]">
              <Led tone={premium ? 'on' : 'off'} />
              {premium ? 'Formule Premium' : 'Formule Gratuite'}
            </p>
            <p className="text-[0.875rem] text-ink-2">
              {premium
                ? `Tous les modèles sont à vous, Natif compris.`
                : `Le modèle Natif est inclus. Les ${PREMIUM_COUNT} autres sont réservés à Premium : essayez-les librement dans l’aperçu.`}
            </p>
          </div>
        </div>
        {!premium && (
          <Button variant="secondary" icon={<Crown strokeWidth={1.8} />} onClick={() => setPremiumOpen(true)}>
            Passer à Premium
          </Button>
        )}
      </motion.section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Choisir un modèle" count={TEMPLATE_LIST.length} />
            <div className="px-3 pb-4 sm:px-5 sm:pb-6">
              <TemplateGallery
                storeType={store.type}
                value={trying}
                onChange={tryTemplate}
                currentId={current}
                locked={(t) => !canUseTemplate(store.plan, t.manifest)}
                content={{ storeName: store.name }}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={template.manifest.fontChoice ? 'Couleurs et polices' : 'Couleurs'} />
            <div className="flex flex-col gap-5 px-3 pb-4 sm:px-5 sm:pb-6">
              <p className="px-1 text-[0.875rem] text-ink-2">
                Palettes préparées pour « {template.manifest.name} » : textes et boutons restent lisibles dans chacune.
              </p>
              <PalettePicker
                palettes={template.manifest.palettes}
                value={palette.id}
                onChange={(id) => setLook({ palette: id })}
              />
              {template.manifest.fontChoice && (
                <div className="grid gap-4 px-1 sm:grid-cols-2">
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
            </div>
          </Card>
        </div>

        <motion.div id="apercu" variants={riseIn} className="flex scroll-mt-6 flex-col gap-4 lg:sticky lg:top-10">
          <LivePreview settings={shown} host={host} />
          <AnimatePresence mode="wait" initial={false}>
            {isCurrent ? (
              <motion.div
                key="publier"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
              >
                <PublishBar site={site} draft={draft} />
              </motion.div>
            ) : (
              <motion.div
                key="essai"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
                className="panel flex flex-wrap items-center justify-between gap-3 p-4"
                aria-live="polite"
              >
                <span className="flex min-w-0 items-center gap-2 text-[0.875rem] text-ink-2">
                  <Led tone="attention" />
                  <span className="min-w-0">
                    Essai de <span className="font-[600] text-ink">« {template.manifest.name} »</span>
                    {!allowed && ' · Premium'}
                  </span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" icon={<Undo2 strokeWidth={1.8} />} onClick={() => tryTemplate(current)}>
                    Revenir au mien
                  </Button>
                  {allowed ? (
                    <Button variant="primary" loading={draft.busy === 'save'} disabled={draft.busy !== null} onClick={adopt}>
                      Utiliser ce modèle
                    </Button>
                  ) : (
                    <Button variant="primary" icon={<Crown strokeWidth={1.8} />} onClick={() => setPremiumOpen(true)}>
                      Passer à Premium
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} store={store} />
      <UnsavedGuard draft={draft} />
    </div>
  );
}

/** Ce que Premium débloque, et comment l'obtenir tant que le paiement en ligne n'existe pas. */
function PremiumDialog({
  open,
  onOpenChange,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreDto;
}) {
  const premiumTemplates = TEMPLATE_LIST.filter((t) => t.manifest.tier === 'premium');
  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Formule Premium pour ${store.name}`)}&body=${encodeURIComponent(
        `Bonjour,\n\nJe souhaite passer la boutique « ${store.name} » (${store.slug}) en formule Premium.\n`,
      )}`
    : null;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Passer à Premium"
      description="Premium débloque tous les modèles. Vos sections, vos produits et vos réglages restent tels quels : seul l’habillage change."
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {premiumTemplates.map((t) => (
          <li key={t.manifest.id} className="flex items-center gap-2 text-[0.875rem]">
            <Led tone="on" />
            {t.manifest.name}
          </li>
        ))}
      </ul>
      <p className="well rounded-xl px-4 py-3 text-[0.875rem] text-ink-2">
        Le paiement en ligne arrive bientôt. En attendant, l’équipe Upsell active Premium sur demande.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
        {mailto && (
          <a href={mailto} className={buttonClasses('primary')}>
            Écrire à l’équipe Upsell
          </a>
        )}
      </div>
    </Dialog>
  );
}
