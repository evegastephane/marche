import { FONT_CHOICES, type SiteDto, type StoreDto, type ThemeSettings } from '@marche/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink, Globe, Paintbrush, PowerOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import emblemeTrait from '@/assets/brand/baobab-embleme-trait.png';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApercuSite } from '@/features/site/apercu';
import { useCollections, useSite, useSiteAction } from '@/features/site/api';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { NomPeint, PlaqueAdresse } from '@/shared/ui/enseigne';
import { LoadError, PageHeader, PlancheHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, Select } from '@/shared/ui/field';
import { Plaque } from '@/shared/ui/plaque';

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

/** Pas encore de site : une enseigne vierge et un seul geste pour la peindre. */
function SansSite({ store }: { store: StoreDto }) {
  const action = useSiteAction();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site" />
      <section className="sur-vert enseigne flex flex-col items-start gap-6 px-7 py-10 sm:px-12 sm:py-14">
        <img src={emblemeTrait} alt="" className="size-16 opacity-90" />
        <h2 className="lettrage max-w-[14ch] text-[3.25rem] sm:text-[4.5rem]">Votre boutique en ligne</h2>
        <p className="max-w-[52ch] text-[1.0625rem] text-white/85">
          Un clic suffit : le site reprend le nom de {store.name}, vos produits en vente et votre stock à jour. Vous
          réglerez ensuite couleurs et textes.
        </p>
        <Button
          variant="jaune"
          size="lg"
          icon={<Paintbrush />}
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
          Peindre mon site
        </Button>
      </section>
    </div>
  );
}

function SiteEditor({ site, store }: { site: SiteDto; store: StoreDto }) {
  const action = useSiteAction();
  const collections = useCollections();
  const reduce = useReducedMotion();
  const [settings, setSettings] = useState<ThemeSettings>(() => structuredClone(site.draftThemeSettings));
  const [dirty, setDirty] = useState(false);
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

  const saveDraft = (then?: () => void) =>
    action.mutate(
      { type: 'save-theme', settings },
      {
        onSuccess: () => {
          setDirty(false);
          if (then) then();
          else toast('Brouillon enregistré', { description: 'Publiez pour l’afficher sur le site.' });
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  const publishTheme = () =>
    action.mutate(
      { type: 'publish-theme' },
      {
        onSuccess: () => toast('Modifications publiées sur votre site'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
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
      <PageHeader title="Site" subtitle="Votre vitrine : elle se met à jour toute seule avec vos produits et votre stock." />

      <motion.section
        className="sur-vert enseigne flex flex-col gap-6 px-6 py-8 sm:px-10 lg:flex-row lg:items-end lg:justify-between"
        initial={reduce ? false : { clipPath: 'inset(0 100% 0 0 round 16px)' }}
        animate={{ clipPath: 'inset(0 0% 0 0 round 16px)' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <NomPeint name={store.name} placeholder="" className="text-[2.75rem] sm:text-[4rem]" />
          <div className="flex flex-wrap items-center gap-2.5">
            <Plaque tone={online ? 'jaune' : 'contour-blanc'}>{online ? 'En ligne' : 'Hors ligne'}</Plaque>
            <a href={site.url} target="_blank" rel="noreferrer" className="no-underline">
              <PlaqueAdresse host={host} />
            </a>
            {site.publishedAt && (
              <span className="text-[0.8125rem] text-white/75">Publié le {formatDateTime(site.publishedAt)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={site.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 font-[650] text-baobab no-underline hover:bg-baobab-50">
            <ExternalLink className="size-4" /> Voir le site
          </a>
          <Button
            variant={online ? 'fantome' : 'jaune'}
            className={online ? 'text-white hover:bg-white/10 hover:text-white' : undefined}
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
          <section className="planche">
            <PlancheHeader title="Couleurs" />
            <div className="grid grid-cols-2 gap-4 px-5 pb-6">
              {(
                [
                  ['primary', 'Principale', 'Bandeau d’accueil, boutons'],
                  ['accent', 'Accent', 'Annonce, appels à l’action'],
                  ['background', 'Fond', 'Fond des pages'],
                  ['foreground', 'Texte', 'Textes et titres'],
                ] as const
              ).map(([key, label, hint]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-chaux">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg shadow-[inset_0_0_0_1.5px_rgb(20_32_26/0.2)]" style={{ background: settings.colors[key] }}>
                    <input
                      type="color"
                      value={settings.colors[key]}
                      onChange={(e) => setColor(key, e.target.value.toUpperCase())}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      aria-label={`Couleur ${label.toLowerCase()}`}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-[640]">{label}</span>
                    <span className="chiffres truncate text-[0.75rem] text-encre-2">
                      {settings.colors[key]} · {hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="planche">
            <PlancheHeader title="Textes et polices" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Police des titres">
                  {(props) => (
                    <Select
                      {...props}
                      value={settings.fonts.heading}
                      onChange={(e) => edit({ ...settings, fonts: { ...settings.fonts, heading: e.target.value as typeof settings.fonts.heading } })}
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
                      onChange={(e) => edit({ ...settings, fonts: { ...settings.fonts, body: e.target.value as typeof settings.fonts.body } })}
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
                    {(props) => <Input {...props} value={hero.title} maxLength={120} onChange={(e) => setSection('hero', { title: e.target.value })} />}
                  </Field>
                  <Field label="Sous-titre">
                    {(props) => (
                      <Input {...props} value={hero.subtitle ?? ''} maxLength={300} onChange={(e) => setSection('hero', { subtitle: e.target.value })} />
                    )}
                  </Field>
                  <Field label="Texte du bouton">
                    {(props) => (
                      <Input {...props} value={hero.ctaLabel ?? ''} maxLength={40} onChange={(e) => setSection('hero', { ctaLabel: e.target.value })} />
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
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={settings.announcement.enabled}
                  onChange={(e) => edit({ ...settings, announcement: { ...settings.announcement, enabled: e.target.checked } })}
                  className="mt-0.5 size-5 accent-baobab"
                />
                <span className="flex flex-col">
                  <span className="font-[640]">Bandeau d’annonce</span>
                  <span className="text-[0.875rem] text-encre-2">Une ligne en haut de chaque page : livraison, horaires…</span>
                </span>
              </label>
              {settings.announcement.enabled && (
                <Field label="Texte du bandeau">
                  {(props) => (
                    <Input
                      {...props}
                      value={settings.announcement.text}
                      maxLength={160}
                      placeholder="Livraison offerte dès 50 000 FCFA"
                      onChange={(e) => edit({ ...settings, announcement: { ...settings.announcement, text: e.target.value } })}
                    />
                  )}
                </Field>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-10">
          <ApercuSite settings={settings} storeName={store.name} host={host} />
          <div className="planche flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-[0.875rem] text-encre-2">
              {dirty ? 'Modifications non enregistrées' : site.hasUnpublishedChanges ? 'Brouillon prêt à publier' : 'Le site est à jour'}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondaire" disabled={!dirty} loading={pending === 'save-theme' && !hasChanges} onClick={() => saveDraft()}>
                Enregistrer
              </Button>
              <Button
                disabled={!hasChanges}
                loading={pending === 'save-theme' || pending === 'publish-theme'}
                onClick={() => (dirty ? saveDraft(publishTheme) : publishTheme())}
              >
                Publier
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
