import { FONT_CHOICES, type SiteDto, type StoreDto, type ThemeSettings } from '@marche/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink, Globe, PowerOff, Rocket } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApercuSite } from '@/features/site/apercu';
import { useCollections, useSite, useSiteAction } from '@/features/site/api';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { UpsellMark } from '@/shared/ui/brand';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select } from '@/shared/ui/field';
import { LiveName } from '@/shared/ui/live-name';
import { EASE_OUT, riseIn, snappy } from '@/shared/ui/motion';
import { SiteAddress } from '@/shared/ui/site-address';
import { Switch } from '@/shared/ui/switch';

export const Route = createFileRoute('/_app/site')({ component: SitePage });

function SitePage() {
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
  return site.data ? <SiteEditor site={site.data} store={store.data} /> : <SansSite store={store.data} />;
}

/** Pas encore de site : un seul geste pour le mettre en ligne. */
function SansSite({ store }: { store: StoreDto }) {
  const action = useSiteAction();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site" />
      <motion.section
        variants={riseIn}
        className="relative isolate flex flex-col items-start gap-6 overflow-hidden rounded-[1.75rem] bg-brand px-7 py-10 text-white shadow-float sm:px-12 sm:py-14"
      >
        <UpsellMark
          mono="#ffffff"
          className="pointer-events-none absolute -right-10 -bottom-12 -z-10 h-64 w-auto opacity-[0.12]"
        />
        <span className="inline-flex rounded-2xl bg-white p-3 shadow-lift">
          <UpsellMark intro delay={0.2} className="h-10 w-auto" />
        </span>
        <h2 className="display max-w-[14ch] text-[2.5rem] sm:text-[3.5rem]">Votre boutique en ligne</h2>
        <p className="max-w-[52ch] text-[1.0625rem] text-white/85">
          Un clic suffit : le site reprend le nom de {store.name}, vos produits en vente et votre stock à jour. Vous
          réglerez ensuite couleurs et textes.
        </p>
        <Button
          variant="accent"
          size="lg"
          icon={<Rocket />}
          loading={action.isPending}
          onClick={() =>
            action.mutate(
              { type: 'generate' },
              {
                onSuccess: () => toast('Votre site est en ligne'),
                onError: (error) => toast.error(errorMessage(error)),
              },
            )
          }
        >
          Mettre mon site en ligne
        </Button>
      </motion.section>
    </div>
  );
}

function SiteEditor({ site, store }: { site: SiteDto; store: StoreDto }) {
  const action = useSiteAction();
  const collections = useCollections();
  const [settings, setSettings] = useState<ThemeSettings>(() => structuredClone(site.draftThemeSettings));
  const [dirty, setDirty] = useState(false);
  // Le bouton qui a lancé l'action porte le chargement (Publier enchaîne enregistrement puis publication).
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const online = site.status === 'PUBLISHED';
  const host = new URL(site.url).host;
  const pending = action.isPending ? action.variables?.type : undefined;

  const edit = (next: ThemeSettings) => {
    setSettings(next);
    setDirty(true);
  };
  const setColor = (key: keyof ThemeSettings['colors'], value: string) =>
    edit({ ...settings, colors: { ...settings.colors, [key]: value } });
  const setSection = <T extends ThemeSettings['sections'][number]['type']>(
    type: T,
    patch: Partial<Extract<ThemeSettings['sections'][number], { type: T }>>,
  ) =>
    edit({
      ...settings,
      sections: settings.sections.map((s) => (s.type === type ? ({ ...s, ...patch } as typeof s) : s)),
    });
  const hero = settings.sections.find((s) => s.type === 'hero');
  const featured = settings.sections.find((s) => s.type === 'featured-collection');

  const fail = (error: unknown) => {
    setBusy(null);
    toast.error(errorMessage(error));
  };
  const publishTheme = () => {
    setBusy('publish');
    action.mutate(
      { type: 'publish-theme' },
      {
        onSuccess: () => {
          setBusy(null);
          toast('Modifications publiées sur votre site');
        },
        onError: fail,
      },
    );
  };
  const saveDraft = (thenPublish = false) => {
    setBusy(thenPublish ? 'publish' : 'save');
    action.mutate(
      { type: 'save-theme', settings },
      {
        onSuccess: () => {
          setDirty(false);
          if (thenPublish) {
            publishTheme();
            return;
          }
          setBusy(null);
          toast('Brouillon enregistré', {
            description: 'Publiez pour l’afficher sur le site.',
          });
        },
        onError: fail,
      },
    );
  };
  const togglePublished = () =>
    action.mutate(
      { type: online ? 'unpublish' : 'publish' },
      {
        onSuccess: () => toast(online ? 'Site mis hors ligne' : 'Site en ligne'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  const hasChanges = dirty || site.hasUnpublishedChanges;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Site"
        subtitle="Votre vitrine : elle se met à jour toute seule avec vos produits et votre stock."
      />

      <motion.section
        variants={riseIn}
        className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[1.75rem] bg-brand px-6 py-8 text-white shadow-float sm:px-10 lg:flex-row lg:items-end lg:justify-between"
      >
        <UpsellMark
          mono="#ffffff"
          className="pointer-events-none absolute -right-8 -bottom-10 -z-10 h-52 w-auto opacity-[0.12]"
        />
        <div className="flex min-w-0 flex-col gap-4">
          <LiveName name={store.name} placeholder="" className="text-[2.25rem] sm:text-[3rem]" />
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              tone={online ? 'success' : 'neutral'}
              className={online ? 'bg-white text-success-ink' : 'bg-white/15 text-white'}
            >
              {online ? 'En ligne' : 'Hors ligne'}
            </Badge>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="no-underline transition-transform hover:-translate-y-px"
            >
              <SiteAddress host={host} live={online} className="bg-white text-[#0c1a3c] shadow-none" />
            </a>
            {site.publishedAt && (
              <span className="text-[0.8125rem] text-white/75">Publié le {formatDateTime(site.publishedAt)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={site.url} target="_blank" rel="noreferrer" className={buttonClasses('inverse')}>
            <ExternalLink /> Voir le site
          </a>
          <Button
            variant={online ? 'ghost' : 'accent'}
            className={online ? 'text-white hover:bg-white/12 hover:text-white' : undefined}
            icon={online ? <PowerOff /> : <Globe />}
            loading={pending === 'publish' || pending === 'unpublish'}
            onClick={togglePublished}
          >
            {online ? 'Mettre hors ligne' : 'Mettre en ligne'}
          </Button>
        </div>
      </motion.section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Couleurs" />
            <div className="grid gap-2 px-3 pb-4 sm:grid-cols-2 sm:gap-4 sm:px-5 sm:pb-6">
              {(
                [
                  ['primary', 'Principale', 'Bandeau d’accueil, boutons'],
                  ['accent', 'Accent', 'Annonce, appels à l’action'],
                  ['background', 'Fond', 'Fond des pages'],
                  ['foreground', 'Texte', 'Textes et titres'],
                ] as const
              ).map(([key, label, hint]) => (
                <label
                  key={key}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2"
                >
                  <motion.span
                    className="relative size-11 shrink-0 overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgb(12_26_60/0.18)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                    animate={{ backgroundColor: settings.colors[key] }}
                    whileHover={{ scale: 1.06, rotate: -3 }}
                    transition={snappy}
                  >
                    <input
                      type="color"
                      value={settings.colors[key]}
                      onChange={(e) => setColor(key, e.target.value.toUpperCase())}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      aria-label={`Couleur ${label.toLowerCase()}`}
                    />
                  </motion.span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-[650]">{label}</span>
                    <span className="tabular truncate text-[0.75rem] text-ink-2">
                      {settings.colors[key]} · {hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Textes et polices" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Police des titres">
                  {(props) => (
                    <Select
                      {...props}
                      value={settings.fonts.heading}
                      onChange={(e) =>
                        edit({
                          ...settings,
                          fonts: {
                            ...settings.fonts,
                            heading: e.target.value as typeof settings.fonts.heading,
                          },
                        })
                      }
                    >
                      {FONT_CHOICES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Police du texte">
                  {(props) => (
                    <Select
                      {...props}
                      value={settings.fonts.body}
                      onChange={(e) =>
                        edit({
                          ...settings,
                          fonts: {
                            ...settings.fonts,
                            body: e.target.value as typeof settings.fonts.body,
                          },
                        })
                      }
                    >
                      {FONT_CHOICES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              {hero?.type === 'hero' && (
                <>
                  <Field label="Titre d’accueil">
                    {(props) => (
                      <Input
                        {...props}
                        value={hero.title}
                        maxLength={120}
                        onChange={(e) => setSection('hero', { title: e.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="Sous-titre">
                    {(props) => (
                      <Input
                        {...props}
                        value={hero.subtitle ?? ''}
                        maxLength={300}
                        onChange={(e) => setSection('hero', { subtitle: e.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="Texte du bouton">
                    {(props) => (
                      <Input
                        {...props}
                        value={hero.ctaLabel ?? ''}
                        maxLength={40}
                        onChange={(e) => setSection('hero', { ctaLabel: e.target.value })}
                      />
                    )}
                  </Field>
                </>
              )}
              {featured?.type === 'featured-collection' && (collections.data?.items.length ?? 0) > 0 && (
                <Field label="Catalogue mis en avant">
                  {(props) => (
                    <Select
                      {...props}
                      value={featured.collectionId ?? ''}
                      onChange={(e) => {
                        const collection = collections.data?.items.find((c) => c.id === e.target.value);
                        setSection('featured-collection', {
                          collectionId: collection?.id ?? null,
                          title: collection?.title ?? featured.title,
                        });
                      }}
                    >
                      <option value="">Aucun</option>
                      {collections.data?.items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
                <Switch
                  checked={settings.announcement.enabled}
                  onChange={(enabled) =>
                    edit({
                      ...settings,
                      announcement: { ...settings.announcement, enabled },
                    })
                  }
                />
                <span className="flex flex-col">
                  <span className="font-[650]">Bandeau d’annonce</span>
                  <span className="text-[0.875rem] text-ink-2">
                    Une ligne en haut de chaque page : livraison, horaires…
                  </span>
                </span>
              </label>
              <AnimatePresence initial={false}>
                {settings.announcement.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <Field label="Texte du bandeau">
                      {(props) => (
                        <Input
                          {...props}
                          value={settings.announcement.text}
                          maxLength={160}
                          placeholder="Livraison offerte dès 50 000 FCFA"
                          onChange={(e) =>
                            edit({
                              ...settings,
                              announcement: {
                                ...settings.announcement,
                                text: e.target.value,
                              },
                            })
                          }
                        />
                      )}
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        <motion.div variants={riseIn} className="flex flex-col gap-4 lg:sticky lg:top-10">
          <ApercuSite settings={settings} storeName={store.name} host={host} />
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2 text-[0.875rem] text-ink-2">
              <motion.span
                aria-hidden
                className={cn(
                  'size-2 shrink-0 rounded-full transition-colors duration-300',
                  dirty ? 'bg-sun' : site.hasUnpublishedChanges ? 'bg-brand' : 'bg-success',
                )}
                animate={{ scale: dirty ? [1, 1.4, 1] : 1 }}
                transition={{ duration: 0.3 }}
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dirty ? 'dirty' : site.hasUnpublishedChanges ? 'draft' : 'ok'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {dirty
                    ? 'Modifications non enregistrées'
                    : site.hasUnpublishedChanges
                      ? 'Brouillon prêt à publier'
                      : 'Le site est à jour'}
                </motion.span>
              </AnimatePresence>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!dirty || busy !== null}
                loading={busy === 'save'}
                onClick={() => saveDraft()}
              >
                Enregistrer
              </Button>
              <Button
                disabled={!hasChanges || busy !== null}
                loading={busy === 'publish'}
                onClick={() => (dirty ? saveDraft(true) : publishTheme())}
              >
                Publier
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
