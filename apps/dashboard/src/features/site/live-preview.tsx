import type {
  Paginated,
  PreviewTokenDto,
  ProductListItemDto,
  ThemeSettings,
} from '@marche/contracts';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Monitor, RotateCw, Smartphone } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { errorMessage } from '@/shared/api/client';
import { useApi, useStoreKey } from '@/shared/api/use-api';
import { cn } from '@/shared/lib/cn';
import { Led } from '@/shared/ui/badge';
import { glide } from '@/shared/ui/motion';

type Device = 'desktop' | 'phone';
type Page = 'home' | 'catalog' | 'product';

/** Taille réelle de la page affichée, avant la mise à l'échelle dans le panneau. */
const VIEWPORT: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 780 },
};

/** Délai entre la dernière modification et l'envoi des réglages au site (frappe continue). */
const PUSH_DELAY = 350;

/**
 * Aperçu en direct : la vraie boutique (produits, photos, prix, stock) dessinée par le template et
 * la palette choisis, qui suit chaque réglage avant même l'enregistrement. Les réglages en cours
 * partent dans une session d'aperçu de 30 minutes ; ni le brouillon ni le site en ligne ne changent.
 */
export function LivePreview({
  settings,
  host,
  focus,
  fill = false,
}: {
  settings: ThemeSettings;
  host: string;
  /** Section à montrer : l'aperçu revient à l'accueil et défile jusqu'à elle (nonce : même section, nouvelle demande). */
  focus?: { id: string; nonce: number } | null;
  /** Plein écran : l'aperçu occupe toute la hauteur de son parent et la page s'y ajuste entière. */
  fill?: boolean;
}) {
  const api = useApi();
  const frame = useRef<HTMLIFrameElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [link, setLink] = useState<PreviewTokenDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [status, setStatus] = useState<
    'loading' | 'updating' | 'ready' | 'blocked'
  >('loading');
  const [path, setPath] = useState('/');
  const productSlug = useFirstProductSlug();

  const push = useCallback(
    async (session: string, next: ThemeSettings) => {
      try {
        await api('PUT', '/api/v1/site/preview-theme', {
          body: { session, settings: next },
        });
        setInvalid(false);
        return true;
      } catch {
        // Réglage en cours de saisie (titre vide…) : l'aperçu garde le dernier état valide.
        setInvalid(true);
        return false;
      }
    },
    [api],
  );

  /** Ouvre (ou renouvelle) la session d'aperçu, avec les réglages du moment. */
  const open = useCallback(async () => {
    try {
      const next = await api<PreviewTokenDto>(
        'POST',
        '/api/v1/site/preview-token',
      );
      await push(next.session, settingsRef.current);
      setFailure(null);
      setStatus('loading');
      setLink(next);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }, [api, push]);

  useEffect(() => {
    void open();
  }, [open]);

  // Le jeton dure 30 minutes : une nouvelle session deux minutes avant la fin.
  useEffect(() => {
    if (!link) return;
    const wait = new Date(link.expiresAt).getTime() - Date.now() - 120_000;
    const timer = setTimeout(() => void open(), Math.max(wait, 30_000));
    return () => clearTimeout(timer);
  }, [link, open]);

  const post = useCallback(
    (
      message:
        | { type: 'refresh' }
        | { type: 'navigate'; path: string }
        | { type: 'focus-section'; id: string },
    ) => {
      if (!link) return;
      frame.current?.contentWindow?.postMessage(
        { source: 'upsell-editor', ...message },
        new URL(link.embedUrl).origin,
      );
    },
    [link],
  );

  // Chaque modification part au site après une courte pause, puis le site se redessine.
  const first = useRef(true);
  useEffect(() => {
    if (!link) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      if (await push(link.session, settings)) post({ type: 'refresh' });
    }, PUSH_DELAY);
    return () => clearTimeout(timer);
  }, [settings, link, push, post]);

  // Montrer la section ouverte ou ajoutée : retour à l'accueil si besoin, puis défilement (le site attend
  // la fin de sa mise à jour pour une section toute neuve).
  const pathRef = useRef(path);
  pathRef.current = path;
  useEffect(() => {
    if (!focus || !link) return;
    if (pathRef.current !== '/') post({ type: 'navigate', path: '/' });
    post({ type: 'focus-section', id: focus.id });
  }, [focus, link, post]);

  // Le site dit la page qu'il affiche et s'il se redessine.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as {
        source?: string;
        type?: string;
        path?: string;
      } | null;
      if (data?.source !== 'upsell-preview') return;
      setStatus(data.type === 'updating' ? 'updating' : 'ready');
      if (typeof data.path === 'string') setPath(data.path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Page chargée mais silencieuse : le navigateur a refusé le cookie d'aperçu intégré.
  const onLoad = () => {
    window.setTimeout(
      () =>
        setStatus((current) => (current === 'loading' ? 'blocked' : current)),
      4000,
    );
  };

  const page: Page = path.startsWith('/products/')
    ? 'product'
    : path.startsWith('/collections')
      ? 'catalog'
      : 'home';
  const goTo = (target: Page) => {
    const to =
      target === 'home'
        ? '/'
        : target === 'catalog'
          ? '/collections'
          : productSlug
            ? `/products/${productSlug}`
            : null;
    if (to) post({ type: 'navigate', path: to });
  };

  return (
    <figure className={cn('flex flex-col gap-3', fill && 'h-full min-h-0')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Page affichée"
          value={page}
          onChange={goTo}
          options={[
            { value: 'home', label: 'Accueil' },
            { value: 'catalog', label: 'Catalogue' },
            ...(productSlug
              ? [{ value: 'product' as const, label: 'Fiche produit' }]
              : []),
          ]}
        />
        <Segmented
          label="Appareil"
          value={device}
          onChange={setDevice}
          options={[
            {
              value: 'desktop',
              label: (
                <Monitor
                  className="size-4"
                  strokeWidth={1.8}
                  aria-label="Ordinateur"
                />
              ),
            },
            {
              value: 'phone',
              label: (
                <Smartphone
                  className="size-4"
                  strokeWidth={1.8}
                  aria-label="Téléphone"
                />
              ),
            },
          ]}
        />
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl bg-surface shadow-float ring-1 ring-line',
          fill && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        <div className="flex items-center gap-2 bg-surface-2 px-3 py-2">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="tabular flex min-w-0 flex-1 items-center justify-center gap-2 truncate rounded-md bg-surface px-2.5 py-0.5 text-[0.75rem] text-ink-2">
            <Led
              tone={
                status === 'ready'
                  ? 'on'
                  : status === 'blocked'
                    ? 'off'
                    : 'attention'
              }
              pulse={status === 'updating'}
            />
            <span className="truncate">
              {host}
              {path === '/' ? '' : path}
            </span>
          </span>
          <button
            type="button"
            onClick={() => post({ type: 'refresh' })}
            disabled={!link}
            className="inline-flex size-7 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
            aria-label="Recharger l’aperçu"
          >
            <RotateCw className="size-3.5" strokeWidth={1.9} />
          </button>
          {link && (
            <a
              href={link.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-7 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink"
              aria-label="Ouvrir l’aperçu dans un nouvel onglet"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.9} />
            </a>
          )}
        </div>
        <Stage device={device} fit={fill}>
          {link && (
            <iframe
              ref={frame}
              key={link.token}
              src={link.embedUrl}
              title={`Aperçu en direct de ${host}`}
              onLoad={onLoad}
              className="block size-full border-0 bg-white"
            />
          )}
          <AnimatePresence>
            {(status === 'loading' || !link) && !failure && (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col gap-[4%] bg-surface p-[5%]"
                aria-hidden
              >
                <span className="h-[6%] w-1/3 animate-pulse rounded-md bg-surface-2" />
                <span className="h-[34%] w-full animate-pulse rounded-lg bg-surface-2" />
                <span className="grid h-[30%] grid-cols-4 gap-[3%]">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="animate-pulse rounded-md bg-surface-2"
                    />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {(failure || status === 'blocked') && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/95 p-6 text-center">
              <p className="max-w-[38ch] text-[0.9375rem] text-ink-2">
                {failure
                  ? `L’aperçu ne s’affiche pas : ${failure}`
                  : 'Votre navigateur bloque l’aperçu intégré. Ouvrez-le dans un nouvel onglet avec le bouton en haut à droite.'}
              </p>
            </div>
          )}
        </Stage>
      </div>
      <figcaption className={cn('flex items-center gap-2 text-[0.8125rem] text-ink-2', fill && 'sr-only')}>
        {invalid
          ? 'Un réglage n’est pas encore valide : l’aperçu garde le dernier état correct.'
          : 'Votre vraie boutique, avec vos réglages en cours. Vos visiteurs voient la version publiée tant que vous ne publiez pas.'}
      </figcaption>
    </figure>
  );
}

/**
 * Scène à l'échelle : la page garde sa vraie largeur (1280 ou 390 px) et se réduit pour tenir.
 * `fit` : elle tient aussi en hauteur (plein écran), centrée dans la place disponible.
 */
function Stage({ device, fit = false, children }: { device: Device; fit?: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry!.contentRect.width, height: entry!.contentRect.height }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const viewport = VIEWPORT[device];
  const byWidth = device === 'desktop' ? size.width : Math.min(size.width - 32, 340);
  const byHeight = fit && size.height > 0 ? ((size.height - (device === 'phone' ? 40 : 0)) * viewport.width) / viewport.height : Infinity;
  const shown = Math.max(0, Math.min(byWidth, byHeight));
  const scale = shown > 0 ? shown / viewport.width : 0;
  return (
    <div
      ref={box}
      className={cn(
        'relative w-full bg-surface-2',
        device === 'phone' && 'flex justify-center py-5',
        fit && 'flex min-h-0 flex-1 items-center justify-center',
      )}
    >
      <motion.div
        layout
        transition={glide}
        className={cn(
          'relative overflow-hidden bg-white',
          device === 'phone' &&
            'rounded-[1.6rem] shadow-float ring-[6px] ring-ink',
        )}
        style={{
          width: shown || '100%',
          height: viewport.height * scale || 320,
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Rail en creux, la face de touche glisse vers le choix (même geste que les autres sélecteurs). */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="well inline-flex gap-0.5 rounded-lg p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex min-h-8 items-center justify-center rounded-md px-3 text-[0.8125rem] font-[600] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${group}`}
                aria-hidden
                className="absolute inset-0 rounded-md bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                transition={glide}
              />
            )}
            <span className="relative inline-flex items-center">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Un produit en vente, pour montrer la fiche produit du template. */
function useFirstProductSlug(): string | null {
  const api = useApi();
  const store = useStoreKey();
  const { data } = useQuery({
    queryKey: ['live-preview-product', store],
    queryFn: ({ signal }) =>
      api<Paginated<ProductListItemDto>>('GET', '/api/v1/products', {
        signal,
        query: { status: 'ACTIVE', limit: 1 },
      }),
    staleTime: 5 * 60_000,
  });
  return data?.items[0]?.slug ?? null;
}
