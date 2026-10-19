import type { SiteDto, StoreDto } from '@marche/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ExternalLink, Eye, Globe, PowerOff, Rocket } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite, useSiteAction } from '@/features/site/api';
import { LivePreview } from '@/features/site/live-preview';
import { PublishBar } from '@/features/site/publish-bar';
import { SectionEditor } from '@/features/site/section-editor';
import { UnsavedGuard } from '@/features/site/unsaved-guard';
import { useThemeDraft } from '@/features/site/use-theme-draft';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { UpsellMark } from '@/shared/ui/brand';
import { Button, buttonClasses } from '@/shared/ui/button';
import { LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';
import { SiteAddress, siteHost } from '@/shared/ui/site-address';

/** `?ajouter=true` (raccourci de l'Accueil) : le choix d'une nouvelle section s'ouvre à l'arrivée. */
const searchSchema = z.object({ ajouter: z.boolean().optional().catch(undefined) });

export const Route = createFileRoute('/_app/site')({ validateSearch: searchSchema, component: SitePage });

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
  if (site.error)
    return (
      <LoadError
        message={errorMessage(site.error)}
        onRetry={() => void site.refetch()}
      />
    );
  if (!store.data) return null;
  return site.data ? (
    <SiteEditor site={site.data} store={store.data} />
  ) : (
    <SansSite store={store.data} />
  );
}

/** Pas encore de site : un seul geste pour le mettre en ligne. */
function SansSite({ store }: { store: StoreDto }) {
  const action = useSiteAction();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site" />
      <motion.section
        variants={riseIn}
        className="panel grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"
      >
        <div className="flex flex-col items-start gap-5">
          <h2 className="display max-w-[16ch] text-[2rem] sm:text-[2.75rem]">
            Votre boutique en ligne, en un clic
          </h2>
          <p className="max-w-[52ch] text-[1.0625rem] text-ink-2">
            Le site reprend le nom de {store.name}, vos produits en vente et
            votre stock à jour. Vous réglerez ensuite couleurs et textes.
          </p>
          <Button
            variant="primary"
            size="lg"
            icon={<Rocket strokeWidth={1.8} />}
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
        </div>
        <div className="display-window flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <span className="legend flex items-center justify-between text-display-dim">
            Adresse du site
            <UpsellMark className="h-4 w-auto text-display-ink" />
          </span>
          <span className="readout text-[1.375rem] break-all sm:text-[1.5rem]">
            {siteHost(store.slug)}
          </span>
          <span className="flex items-center gap-2 text-[0.8125rem] text-display-dim">
            <span
              aria-hidden
              className="size-2 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-display-dim)]"
            />
            Hors ligne tant que vous n’avez pas appuyé
          </span>
        </div>
      </motion.section>
    </div>
  );
}

function SiteEditor({ site, store }: { site: SiteDto; store: StoreDto }) {
  const { ajouter } = Route.useSearch();
  const navigate = useNavigate();
  // Ouvert une fois : l'adresse redevient /site, un rechargement ne rouvre pas le choix.
  const [autoAdd] = useState(Boolean(ajouter));
  useEffect(() => {
    if (ajouter) void navigate({ to: '/site', search: {}, replace: true });
  }, [ajouter, navigate]);
  const action = useSiteAction();
  const draft = useThemeDraft(site);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const online = site.status === 'PUBLISHED';
  const host = new URL(site.url).host;
  const pending = action.isPending ? action.variables?.type : undefined;

  const togglePublished = () =>
    action.mutate(
      { type: online ? 'unpublish' : 'publish' },
      {
        onSuccess: () =>
          toast(online ? 'Site mis hors ligne' : 'Site en ligne'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Site"
        subtitle="Composez votre page d’accueil section par section ; vos produits et votre stock se mettent à jour tout seuls."
      />

      <motion.section
        variants={riseIn}
        className="panel flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="heading text-[1.25rem]">{store.name}</h2>
            <Badge tone={online ? 'on' : 'off'}>
              {online ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="max-w-full no-underline transition-transform duration-200 hover:-translate-y-px"
              aria-label={`Ouvrir le site ${host}`}
            >
              <SiteAddress host={host} live={online} />
            </a>
            {site.publishedAt && (
              <span className="text-[0.8125rem] text-ink-2">
                Publié le {formatDateTime(site.publishedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses('secondary')}
          >
            <ExternalLink strokeWidth={1.8} /> Voir le site
          </a>
          <Button
            variant={online ? 'ghost' : 'primary'}
            icon={
              online ? (
                <PowerOff strokeWidth={1.8} />
              ) : (
                <Globe strokeWidth={1.8} />
              )
            }
            loading={pending === 'publish' || pending === 'unpublish'}
            onClick={togglePublished}
          >
            {online ? 'Mettre hors ligne' : 'Mettre en ligne'}
          </Button>
        </div>
      </motion.section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <SectionEditor
            autoAdd={autoAdd}
            settings={draft.settings}
            edit={draft.edit}
            store={store}
            onFocus={(id) => setFocus((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }))}
          />
          <a
            href="#apercu"
            className={buttonClasses('secondary', 'md', 'self-start lg:hidden')}
          >
            <Eye strokeWidth={1.8} /> Voir l’aperçu
          </a>
        </div>

        <motion.div
          id="apercu"
          variants={riseIn}
          className="flex scroll-mt-6 flex-col gap-4 lg:sticky lg:top-10"
        >
          <LivePreview settings={draft.settings} host={host} focus={focus} />
          <PublishBar
            site={site}
            draft={draft}
            className="max-lg:sticky max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-lg:z-20 max-lg:shadow-float"
          />
        </motion.div>
      </div>
      <UnsavedGuard draft={draft} />
    </div>
  );
}
