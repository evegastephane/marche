import type { Currency, PosVariantDto } from '@marche/contracts';
import { Camera, Package, ScanBarcode, SearchX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/format';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { controlClasses } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { usePosLookup, usePosVariants } from './api';
import { CameraScanner, canScanWithCamera } from './camera-scanner';
import type { TicketApi } from './ticket';

/** Bip discret de la caisse quand un article entre dans le ticket (comme une douchette). */
function beep() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 1320;
    gain.gain.value = 0.04;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
    oscillator.onended = () => void context.close();
  } catch {
    // son indisponible : rien de grave
  }
}

function stockLabel(variant: PosVariantDto): { tone: 'on' | 'attention' | 'danger' | 'off'; text: string } {
  if (variant.available === null) return { tone: 'off', text: 'Sans stock suivi' };
  if (variant.available <= 0) return { tone: 'danger', text: 'Rupture' };
  const unit = variant.tracksUnits ? (variant.available > 1 ? 'appareils' : 'appareil') : 'en stock';
  return { tone: variant.available <= 2 ? 'attention' : 'on', text: `${variant.available} ${unit}` };
}

/**
 * Les articles du comptoir : un champ toujours prêt pour la douchette (code-barres, SKU, IMEI),
 * qui filtre aussi la grille quand on tape un nom ; la caméra du téléphone en renfort.
 */
/**
 * Grille des articles : autant de colonnes que la place en permet, sans descendre sous 10,5rem,
 * pour que le nom (deux lignes), la déclinaison et le prix se lisent en entier au comptoir.
 */
const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3';

export function CatalogPanel({
  currency,
  ticket,
  onNeedUnit,
  className,
}: {
  currency: Currency;
  ticket: TicketApi;
  /** Article suivi à l'unité choisi sans IMEI : il faut désigner l'appareil. */
  onNeedUnit: (variant: PosVariantDto) => void;
  className?: string;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const lookup = usePosLookup();
  const variants = usePosVariants(q);
  const items = variants.data?.pages.flatMap((page) => page.items) ?? [];
  const cameraAvailable = canScanWithCamera();

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  const focus = () => window.setTimeout(() => field.current?.focus(), 0);

  const add = useCallback(
    (variant: PosVariantDto, serial: string | null = null) => {
      if (variant.tracksUnits && !serial) {
        onNeedUnit(variant);
        return;
      }
      const result = ticket.add(variant, serial);
      if (result === 'out-of-stock') toast.error(`Plus de stock pour « ${variant.productTitle} ».`);
      else if (result === 'duplicate-serial') toast.error('Cet appareil est déjà dans le ticket.');
      else beep();
    },
    [ticket, onNeedUnit],
  );

  const scan = (code: string) => {
    const value = code.trim();
    if (!value) return;
    setMessage(null);
    lookup.mutate(value, {
      onSuccess: ({ variant, serial }) => {
        add(variant, serial);
        setText('');
        setQ('');
        focus();
      },
      onError: (error) => {
        // Pas un code : la recherche par nom prend le relais ; un seul résultat s'ajoute directement.
        if (error instanceof ApiError && error.status === 404) {
          if (items.length === 1 && q === value) {
            add(items[0]!);
            setText('');
            setQ('');
          } else {
            setMessage(items.length === 0 ? `Aucun article ne correspond à « ${value} ».` : null);
          }
        } else {
          setMessage(errorMessage(error));
        }
        focus();
      },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    scan(text);
  };

  // La caméra garde le même rappel (elle ne redémarre pas), qui appelle la lecture la plus récente.
  const latestScan = useRef(scan);
  useEffect(() => {
    latestScan.current = scan;
  });
  const onCameraDetect = useCallback((code: string) => {
    setCamera(false);
    latestScan.current(code);
  }, []);

  return (
    <Card className={cn('flex min-w-0 flex-col gap-4 p-4 sm:p-5', className)}>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <ScanBarcode className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} aria-hidden />
          <input
            ref={field}
            autoFocus
            type="search"
            inputMode="search"
            autoComplete="off"
            aria-label="Scanner un code-barres ou un IMEI, ou chercher un article"
            placeholder="Scanner un code, un IMEI, ou chercher un article"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setMessage(null);
            }}
            className={cn(controlClasses, 'h-12 pr-4 pl-11 text-base [&::-webkit-search-cancel-button]:hidden')}
          />
        </div>
        {cameraAvailable && (
          <Button size="lg" variant="secondary" aria-label="Scanner à la caméra" onClick={() => setCamera(true)} className="px-3.5">
            <Camera strokeWidth={1.8} />
          </Button>
        )}
      </form>
      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, x: [0, -3, 3, -1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="-mt-1 text-[0.875rem] font-[560] text-danger-ink"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {variants.error ? (
        <LoadError message={errorMessage(variants.error)} onRetry={() => void variants.refetch()} />
      ) : variants.isPending ? (
        <div className={CARD_GRID}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={q ? SearchX : Package} title={q ? 'Aucun article' : 'Aucun article à vendre'} className="px-0">
          {q ? `Rien ne correspond à « ${q} » : vérifiez l’orthographe, ou scannez le code-barres.` : 'Ajoutez des produits au catalogue pour les vendre au comptoir.'}
        </EmptyState>
      ) : (
        <>
          <ul className={cn(CARD_GRID, variants.isPlaceholderData && 'opacity-60')}>
            {items.map((variant) => {
              const stock = stockLabel(variant);
              const empty = variant.available !== null && variant.available <= 0;
              const inTicket = ticket.ticket.lines.find((line) => line.variantId === variant.variantId)?.quantity ?? 0;
              return (
                <li key={variant.variantId}>
                  <motion.button
                    type="button"
                    disabled={empty}
                    onClick={() => {
                      add(variant);
                      focus();
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={glide}
                    className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface text-left shadow-[0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--color-line-strong)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="well relative m-1.5 mb-0 flex aspect-square items-center justify-center overflow-hidden rounded-[0.7rem]">
                      {variant.imageUrl ? (
                        <img src={variant.imageUrl} alt="" loading="lazy" className="size-full object-contain p-1.5" />
                      ) : (
                        <Package className="size-7 text-ink-3" strokeWidth={1.5} aria-hidden />
                      )}
                      <AnimatePresence>
                        {inTicket > 0 && (
                          <motion.span
                            key="dans-le-ticket"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={glide}
                            className="tabular absolute top-1.5 right-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[0.75rem] font-[650] text-canvas"
                            aria-label={`${inTicket} dans le ticket`}
                          >
                            {inTicket}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="flex flex-1 flex-col gap-1 px-3 pt-2 pb-3">
                      <span className="line-clamp-2 min-h-[2lh] text-[0.875rem] leading-snug font-[600]">{variant.productTitle}</span>
                      <span className="line-clamp-2 text-[0.75rem] leading-snug text-ink-2">
                        {variant.variantTitle !== 'Par défaut' ? variant.variantTitle : variant.sku}
                      </span>
                      <span className="tabular mt-auto pt-1 text-[0.9375rem] font-[650]">{formatMoney(variant.priceAmount, currency)}</span>
                      <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-[560] text-ink-2">
                        <Led tone={stock.tone} />
                        {stock.text}
                        {!variant.productActive && <span className="text-ink-3"> · hors site</span>}
                      </span>
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
          {variants.hasNextPage && (
            <Button variant="ghost" className="self-center" loading={variants.isFetchingNextPage} onClick={() => void variants.fetchNextPage()}>
              Afficher plus d’articles
            </Button>
          )}
        </>
      )}

      <CameraScanner open={camera} onOpenChange={setCamera} onDetect={onCameraDetect} />
    </Card>
  );
}
