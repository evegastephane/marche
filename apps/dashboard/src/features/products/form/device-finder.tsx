import type {
  DeviceModelDto,
  DeviceSearchDto,
  DeviceSearchHitDto,
} from '@marche/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { ApiError } from '@/shared/api/client';
import { useApi } from '@/shared/api/use-api';
import { cn } from '@/shared/lib/cn';
import { EASE_OUT } from '@/shared/ui/motion';

/** Message d'une panne du service de fiches techniques (le détail des erreurs 5xx n'est pas transmis). */
function importError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'DEVICE_SERVICE_QUOTA')
      return 'Quota de recherche en ligne atteint pour ce mois : remplissez la fiche à la main.';
    if (error.code === 'DEVICE_SERVICE_DISABLED')
      return 'La recherche en ligne n’est pas branchée.';
    if (error.code === 'DEVICE_SERVICE_UNAVAILABLE')
      return 'Le service de fiches techniques ne répond pas. Réessayez dans un instant.';
    return error.message;
  }
  return 'La fiche n’a pas pu être chargée.';
}

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Fiche préremplie : on tape le modèle, on choisit dans la liste, et la fiche technique, la description,
 * les capacités et les coloris se remplissent. Tout reste modifiable ; « Annuler » rend la fiche d'avant.
 */
export function DeviceFinder({
  applied,
  onPick,
  onUndo,
}: {
  /** Modèle appliqué à la fiche en cours (pour l'annuler). */
  applied: string | null;
  onPick: (device: DeviceModelDto) => void;
  onUndo: () => void;
}) {
  const api = useApi();
  const list = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = useDebounced(query.trim(), 300);

  const search = useQuery({
    queryKey: ['devices', 'search', q],
    queryFn: ({ signal }) =>
      api<DeviceSearchDto>('GET', '/api/v1/devices/search', {
        signal,
        query: { q },
      }),
    enabled: q.length >= 2,
    staleTime: 10 * 60_000,
  });
  const load = useMutation({
    mutationFn: (hit: DeviceSearchHitDto) =>
      api<DeviceModelDto>('POST', '/api/v1/devices/import', {
        body: { ref: hit.ref },
      }),
    onSuccess: (device) => {
      onPick(device);
      setOpen(false);
      setQuery('');
    },
  });

  const items = search.data?.items ?? [];
  const pick = (hit: DeviceSearchHitDto | undefined) => {
    if (hit && !load.isPending) load.mutate(hit);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && items[active]) {
      event.preventDefault();
      pick(items[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };
  const showList = open && q.length >= 2;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <label className="well flex min-h-12 items-center gap-3 rounded-xl px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
          <Search
            className="size-4 shrink-0 text-ink-2"
            strokeWidth={2}
            aria-hidden
          />
          <span className="sr-only">
            Chercher le modèle pour préremplir la fiche
          </span>
          <input
            role="combobox"
            aria-expanded={showList}
            aria-controls={list}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && items[active] ? `${list}-${active}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Chercher le modèle : iPhone 12, Galaxy A54, Tecno Spark 20…"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-ink-3"
          />
          {(search.isFetching || load.isPending) && (
            <Loader2
              className="size-4 shrink-0 animate-spin text-ink-2"
              aria-label="Chargement"
            />
          )}
        </label>
        <AnimatePresence>
          {showList && (
            <motion.ul
              id={list}
              role="listbox"
              aria-label="Modèles trouvés"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
              className="panel absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-y-auto p-1.5 shadow-float"
            >
              {items.map((hit, index) => (
                <li
                  key={hit.ref}
                  id={`${list}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(hit)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2',
                    index === active && 'bg-surface-2',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-[600]">{hit.name}</span>
                    <span className="text-[0.75rem] text-ink-2">
                      {hit.year ?? 'Année inconnue'} ·{' '}
                      {hit.source === 'catalog'
                        ? 'Fiche déjà dans Upsell'
                        : 'Fiche en ligne'}
                    </span>
                  </span>
                  {load.isPending && load.variables?.ref === hit.ref && (
                    <Loader2
                      className="size-4 animate-spin text-ink-2"
                      aria-hidden
                    />
                  )}
                </li>
              ))}
              {items.length === 0 && !search.isFetching && (
                <li className="px-3 py-3 text-[0.875rem] text-ink-2">
                  {search.data && !search.data.online
                    ? 'Aucune fiche connue. La recherche en ligne n’est pas encore branchée : remplissez la fiche à la main.'
                    : 'Aucun modèle trouvé : vérifiez l’orthographe, ou remplissez la fiche à la main.'}
                </li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {(applied || load.error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            {load.error ? (
              <p
                role="alert"
                className="text-[0.875rem] font-[560] text-danger-ink"
              >
                {importError(load.error)}
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-ink-2">
                <span className="inline-flex items-center gap-1.5 font-[600] text-ink">
                  <Check className="size-4" strokeWidth={2.2} aria-hidden />
                  Fiche remplie avec « {applied} »
                </span>
                <span>
                  Relisez-la : prix, état et accessoires fournis restent à vous.
                </span>
                <button
                  type="button"
                  onClick={onUndo}
                  className="inline-flex min-h-9 items-center gap-1.5 font-[600] text-ink underline-offset-4 hover:underline"
                >
                  <Undo2 className="size-3.5" strokeWidth={2} aria-hidden />{' '}
                  Annuler
                </button>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
