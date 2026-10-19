import {
  canUseTemplate,
  filterTemplates,
  getTemplate,
  resolvePalette,
  type SiteDto,
  type StoreDto,
  TEMPLATE_SECTORS,
  TEMPLATE_STYLES,
  type TemplateDefinition,
  templatesForStore,
} from '@marche/contracts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Crown, LayoutTemplate, SearchX } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { z } from 'zod';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { UnsavedGuard } from '@/features/site/unsaved-guard';
import { useThemeDraft } from '@/features/site/use-theme-draft';
import { PremiumDialog, premiumCount } from '@/features/templates/premium-dialog';
import { Rayon, RayonItem } from '@/features/templates/rayon';
import { TemplateCard } from '@/features/templates/template-card';
import { TemplateThumb } from '@/features/templates/template-thumb';
import { TemplateTrial } from '@/features/templates/template-trial';
import { errorMessage } from '@/shared/api/client';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Tabs } from '@/shared/ui/tabs';

/**
 * Galerie et essai dans l'adresse : une recherche, un filtre ou un essai se partagent et survivent au rechargement.
 * Sans recherche ni filtre (ni « vue=tout »), la galerie montre ses rayons ; sinon, la grille des résultats.
 */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  secteur: z.string().max(40).optional().catch(undefined),
  style: z.string().max(40).optional().catch(undefined),
  formule: z.enum(['free', 'premium']).optional().catch(undefined),
  vue: z.enum(['tout']).optional().catch(undefined),
  essai: z.string().max(40).optional().catch(undefined),
});
type GallerySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_app/templates')({ validateSearch: searchSchema, component: ModelesPage });

/** Modèles par page de résultats ; « Afficher plus » en ajoute autant. */
const PAGE = 24;
/** Un rayon de style n'ouvre qu'à partir de deux modèles : un rayon d'un seul fait une étagère vide. */
const MIN_STYLE_SHELF = 2;

function ModelesPage() {
  const site = useSite();
  const store = useCurrentStore();

  if (site.isPending || store.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-56" />
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
          <EmptyState icon={LayoutTemplate} title="Votre site n’est pas encore en ligne">
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
  return <Gallery site={site.data} store={store.data} />;
}

function Gallery({ site, store }: { site: SiteDto; store: StoreDto }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const draft = useThemeDraft(site);
  const [premiumOpen, setPremiumOpen] = useState(false);
  // Capture d'où l'essai est parti : elle grandit jusqu'au plein écran (absent quand on arrive par un lien).
  const [origin, setOrigin] = useState<string | null>(null);

  const all = useMemo(() => templatesForStore(store.type), [store.type]);
  const current = getTemplate(draft.settings.template) ?? getTemplate('default')!;
  const trying = search.essai ? getTemplate(search.essai) : undefined;
  const locked = (t: TemplateDefinition) => !canUseTemplate(store.plan, t.manifest);
  const set = (patch: Partial<GallerySearch>) =>
    void navigate({ search: (prev: GallerySearch) => ({ ...prev, ...patch }), replace: true });
  const open = (template: TemplateDefinition, layoutKey: string) => {
    setOrigin(layoutKey);
    set({ essai: template.manifest.id });
  };
  const filtering = Boolean(search.vue || search.q || search.secteur || search.style || search.formule);

  const card = (template: TemplateDefinition, shelf: string, eager = false) => {
    const layoutKey = `${shelf}-${template.manifest.id}`;
    return (
      <TemplateCard
        template={template}
        storeType={store.type}
        storeName={store.name}
        current={template.manifest.id === current.manifest.id}
        locked={locked(template)}
        layoutKey={layoutKey}
        opened={trying !== undefined && origin === layoutKey}
        onOpen={() => open(template, layoutKey)}
        eager={eager}
      />
    );
  };

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-6 lg:gap-8">
        <PageHeader
          title="Modèles"
          subtitle="L’apparence de votre site. Vos sections restent les mêmes dans chaque modèle : essayez-les sur votre vraie boutique."
        />

        <CurrentFace
          template={current}
          store={store}
          paletteName={resolvePalette(draft.settings).name}
          query={search.q ?? ''}
          onQuery={(q) => set({ q: q || undefined })}
          opened={trying !== undefined && origin === `actuel-${current.manifest.id}`}
          onCustomize={() => open(current, `actuel-${current.manifest.id}`)}
          onUpgrade={() => setPremiumOpen(true)}
        />

        {filtering ? (
          <Results all={all} storeType={store.type} search={search} set={set} card={card} />
        ) : (
          <Shelves all={all} store={store} set={set} card={card} />
        )}
      </div>

      <AnimatePresence>
        {trying && (
          <TemplateTrial
            key={trying.manifest.id}
            template={trying}
            layoutId={origin ?? undefined}
            site={site}
            store={store}
            draft={draft}
            onClose={() => set({ essai: undefined })}
            onUpgrade={() => setPremiumOpen(true)}
          />
        )}
      </AnimatePresence>

      <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} store={store} />
      <UnsavedGuard draft={draft} />
    </LayoutGroup>
  );
}

/** En tête : le modèle du site (capture, nom, palette, Personnaliser), la formule et la recherche. */
function CurrentFace({
  template,
  store,
  paletteName,
  query,
  onQuery,
  opened,
  onCustomize,
  onUpgrade,
}: {
  template: TemplateDefinition;
  store: StoreDto;
  paletteName: string;
  query: string;
  onQuery: (q: string) => void;
  opened: boolean;
  onCustomize: () => void;
  onUpgrade: () => void;
}) {
  const premium = store.plan === 'PREMIUM';
  return (
    <motion.section
      variants={riseIn}
      aria-labelledby="votre-modele"
      className="panel grid gap-5 p-3 sm:p-4 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-center lg:gap-7"
    >
      <button
        type="button"
        onClick={onCustomize}
        aria-label={`Personnaliser « ${template.manifest.name} »`}
        className="group block rounded-[0.8rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <motion.span
          layoutId={opened ? undefined : `actuel-${template.manifest.id}`}
          style={{ opacity: opened ? 0 : 1 }}
          className="block overflow-hidden rounded-[0.7rem] shadow-[0_0_0_1px_var(--color-line)] transition-[box-shadow,translate] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1px_var(--color-line-strong),0_14px_28px_-18px_hsl(var(--shadow-color)/0.45)]"
        >
          <TemplateThumb template={template} storeType={store.type} storeName={store.name} eager />
        </motion.span>
      </button>

      <div className="flex min-w-0 flex-col gap-5 px-1 pb-1 lg:pr-2">
        <div className="flex flex-col gap-1.5">
          <h2 id="votre-modele" className="heading text-[1rem]">
            Votre modèle
          </h2>
          <p className="text-[1.375rem] leading-tight font-[650] tracking-[-0.015em]">{template.manifest.name}</p>
          <p className="text-[0.875rem] text-ink-2">Palette « {paletteName} »</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onCustomize}>
            Personnaliser
          </Button>
          {!premium && (
            <Button variant="ghost" icon={<Crown strokeWidth={1.8} />} onClick={onUpgrade}>
              Passer à Premium
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 xl:flex-row xl:items-center xl:justify-between">
          <p className="flex items-center gap-2 text-[0.875rem] text-ink-2">
            <Led tone={premium ? 'on' : 'off'} />
            {premium
              ? 'Formule Premium : tous les modèles de votre boutique'
              : `Formule Gratuite : Natif inclus, ${premiumCount(store.type)} modèles Premium à essayer`}
          </p>
          <SearchInput
            label="Chercher un modèle"
            placeholder="Chercher un modèle"
            value={query}
            onChange={onQuery}
            className="w-full xl:w-64 xl:shrink-0"
          />
        </div>
      </div>
    </motion.section>
  );
}

type CardFor = (template: TemplateDefinition, shelf: string, eager?: boolean) => ReactNode;

/** Les rayons : sélections d'Upsell, nouveautés, gratuits, puis un rayon par style. */
function Shelves({
  all,
  store,
  set,
  card,
}: {
  all: TemplateDefinition[];
  store: StoreDto;
  set: (patch: Partial<GallerySearch>) => void;
  card: CardFor;
}) {
  const featured = all.filter((t) => t.manifest.featured);
  const newest = [...all].sort((a, b) => b.manifest.addedAt.localeCompare(a.manifest.addedAt)).slice(0, 12);
  const free = all.filter((t) => t.manifest.tier === 'free');
  const styles = TEMPLATE_STYLES.map((style) => ({
    style,
    templates: all.filter((t) => t.manifest.styles.includes(style.id)),
  })).filter((shelf) => shelf.templates.length >= MIN_STYLE_SHELF);

  const shelves: { key: string; title: string; templates: TemplateDefinition[]; seeAll: Partial<GallerySearch> }[] = [
    { key: 'pour-vous', title: 'Pour votre boutique', templates: featured, seeAll: { vue: 'tout' as const } },
    { key: 'nouveautes', title: 'Nouveautés', templates: newest, seeAll: { vue: 'tout' as const } },
    ...(store.plan === 'FREE' && free.length > 0
      ? [{ key: 'gratuits', title: 'Gratuits', templates: free, seeAll: { formule: 'free' as const } }]
      : []),
    ...styles.map(({ style, templates }) => ({
      key: `style-${style.id}`,
      title: style.label,
      templates,
      seeAll: { style: style.id },
    })),
  ].filter((shelf) => shelf.templates.length > 0);

  return (
    <div className="flex flex-col gap-7 lg:gap-9">
      {shelves.map((shelf, index) => (
        <Rayon key={shelf.key} title={shelf.title} count={shelf.templates.length} onSeeAll={() => set(shelf.seeAll)}>
          {shelf.templates.map((template) => (
            <RayonItem key={template.manifest.id}>{card(template, shelf.key, index === 0)}</RayonItem>
          ))}
        </Rayon>
      ))}
      <motion.div variants={riseIn} className="flex justify-center">
        <Button variant="secondary" onClick={() => set({ vue: 'tout' })}>
          Tous les modèles de votre boutique
          <span className="tabular text-ink-3">{all.length}</span>
        </Button>
      </motion.div>
    </div>
  );
}

/** La grille : recherche et filtres (secteur, style, formule) sur les modèles du type de boutique. */
function Results({
  all,
  storeType,
  search,
  set,
  card,
}: {
  all: TemplateDefinition[];
  storeType: StoreDto['type'];
  search: GallerySearch;
  set: (patch: Partial<GallerySearch>) => void;
  card: CardFor;
}) {
  const [shown, setShown] = useState(PAGE);
  const filters = { q: search.q, sector: search.secteur, style: search.style, tier: search.formule };
  const results = filterTemplates(all, filters).sort(
    (a, b) => Number(b.manifest.featured) - Number(a.manifest.featured) || b.manifest.addedAt.localeCompare(a.manifest.addedAt),
  );
  // Seuls les secteurs et styles qui ont des modèles pour cette boutique deviennent des filtres.
  const sectors = TEMPLATE_SECTORS[storeType].filter((s) => all.some((t) => t.manifest.sectors.includes(s.id)));
  const styles = TEMPLATE_STYLES.filter((s) => all.some((t) => t.manifest.styles.includes(s.id)));
  const reset = () => set({ q: undefined, secteur: undefined, style: undefined, formule: undefined, vue: undefined });
  const refine = (patch: Partial<GallerySearch>) => {
    setShown(PAGE);
    set({ vue: 'tout', ...patch });
  };

  return (
    <motion.section variants={riseIn} aria-label="Tous les modèles" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="group inline-flex min-h-9 items-center gap-1.5 self-start text-[0.875rem] font-[560] text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} aria-hidden />
          Les sélections
        </button>
        <FilterRow label="Secteur">
          <Tabs
            label="Secteur"
            value={search.secteur ?? ''}
            onChange={(secteur) => refine({ secteur: secteur || undefined })}
            items={[{ value: '', label: 'Tous' }, ...sectors.map((s) => ({ value: s.id, label: s.label }))]}
          />
        </FilterRow>
        <FilterRow label="Style">
          <Tabs
            label="Style"
            value={search.style ?? ''}
            onChange={(style) => refine({ style: style || undefined })}
            items={[{ value: '', label: 'Tous' }, ...styles.map((s) => ({ value: s.id, label: s.label }))]}
          />
        </FilterRow>
        <FilterRow label="Formule">
          <Tabs
            label="Formule"
            value={search.formule ?? ''}
            onChange={(formule) => refine({ formule: (formule || undefined) as GallerySearch['formule'] })}
            items={[
              { value: '', label: 'Toutes' },
              { value: 'free', label: 'Gratuits' },
              { value: 'premium', label: 'Premium' },
            ]}
          />
        </FilterRow>
      </div>

      <p className="tabular px-1 text-[0.875rem] text-ink-2" aria-live="polite">
        {results.length} modèle{results.length > 1 ? 's' : ''}
        {search.q && <> pour « {search.q} »</>}
      </p>

      {results.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="Aucun modèle ne correspond">
            Essayez un autre mot ou moins de filtres.{' '}
            <button type="button" onClick={reset} className="font-[600] text-ink underline underline-offset-4">
              Tout effacer
            </button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
            {results.slice(0, shown).map((template, index) => (
              <li key={template.manifest.id}>{card(template, 'grille', index < 6)}</li>
            ))}
          </ul>
          {results.length > shown && (
            <Button variant="secondary" className="self-center" onClick={() => setShown((n) => n + PAGE)}>
              Afficher plus de modèles
              <span className="tabular text-ink-3">{results.length - shown}</span>
            </Button>
          )}
        </>
      )}
    </motion.section>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="legend w-16 shrink-0 px-1">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
