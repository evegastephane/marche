import type { MediaDto } from '@marche/contracts';
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { type ChangeEvent, type DragEvent, type ReactNode, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { glide, press } from '@/shared/ui/motion';
import { imageProblem, mediaSrc, useUploadImage } from './api';

interface Pending {
  key: string;
  preview: string;
}

/**
 * Photos d'un produit : une bande de vignettes qu'on réordonne en les faisant glisser
 * (ou avec les flèches, au clavier). La première est la photo principale, celle du site.
 * On ajoute des photos en cliquant ou en les déposant sur la bande ; elles partent directement au stockage.
 */
export function MediaGallery({
  media,
  onChange,
  max = 20,
  label = 'Photos',
}: {
  media: MediaDto[];
  onChange: (media: MediaDto[]) => void;
  max?: number;
  label?: string;
}) {
  const upload = useUploadImage();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Toujours la liste à jour, même quand plusieurs envois se terminent dans le désordre.
  const latest = useRef(media);
  latest.current = media;

  const room = max - media.length - pending.length;

  const addFiles = (files: File[]) => {
    const accepted: File[] = [];
    for (const file of files) {
      const problem = imageProblem(file);
      if (problem) toast.error(problem);
      else accepted.push(file);
    }
    if (accepted.length > room) toast.error(`${max} photos au maximum par produit.`);
    for (const file of accepted.slice(0, Math.max(room, 0))) {
      const item = { key: crypto.randomUUID(), preview: URL.createObjectURL(file) };
      setPending((prev) => [...prev, item]);
      upload(file)
        .then((uploaded) => onChange([...latest.current, uploaded]))
        .catch((error) => toast.error(errorMessage(error)))
        .finally(() => {
          URL.revokeObjectURL(item.preview);
          setPending((prev) => prev.filter((p) => p.key !== item.key));
        });
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...media];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-[0.8125rem] font-[600] text-ink">
          {label}
        </label>
        <span className="tabular text-[0.75rem] text-ink-3">
          {media.length}/{max}
        </span>
      </div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'well flex gap-2 overflow-x-auto rounded-xl p-2 transition-shadow duration-200 [scrollbar-width:thin]',
          dragOver && 'shadow-[inset_0_0_0_1.5px_var(--color-ink)]',
        )}
      >
        <Reorder.Group axis="x" values={media} onReorder={onChange} className="flex gap-2" as="ul">
          {media.map((item, index) => (
            <Reorder.Item
              key={item.id}
              value={item}
              as="li"
              transition={glide}
              whileDrag={{ scale: 1.04, zIndex: 10, boxShadow: '0 12px 28px -12px rgb(16 17 21 / 0.35)' }}
              className="group relative size-24 shrink-0 cursor-grab touch-pan-y overflow-hidden rounded-[0.7rem] bg-surface ring-1 ring-line active:cursor-grabbing sm:size-28"
            >
              <img
                src={mediaSrc(item)}
                alt={item.alt ?? ''}
                draggable={false}
                className="pointer-events-none size-full object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/85 px-1.5 py-0.5 text-[0.625rem] font-[600] text-canvas">
                  Principale
                </span>
              )}
              <span className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                {index > 0 && (
                  <TileButton label="Déplacer vers la gauche" onClick={() => move(index, -1)}>
                    <ChevronLeft />
                  </TileButton>
                )}
                {index < media.length - 1 && (
                  <TileButton label="Déplacer vers la droite" onClick={() => move(index, 1)}>
                    <ChevronRight />
                  </TileButton>
                )}
                <TileButton label="Retirer la photo" onClick={() => onChange(media.filter((m) => m.id !== item.id))}>
                  <X />
                </TileButton>
              </span>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <AnimatePresence initial={false}>
          {pending.map((item) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={press}
              className="relative size-24 shrink-0 overflow-hidden rounded-[0.7rem] ring-1 ring-line sm:size-28"
            >
              <img src={item.preview} alt="" className="size-full object-cover opacity-50" />
              <span className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-ink" aria-hidden />
                <span className="sr-only">Envoi en cours</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-[0.7rem] border border-dashed border-line-strong text-[0.75rem] font-[560] text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface hover:text-ink sm:size-28"
          >
            <ImagePlus className="size-5" strokeWidth={1.6} aria-hidden />
            Ajouter
          </button>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>
      <p className="text-[0.8125rem] text-ink-2">
        Glissez pour changer l’ordre : la première photo apparaît sur le site. JPEG, PNG ou WebP, 10 Mo au plus.
      </p>
    </div>
  );
}

function TileButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-md bg-surface/90 text-ink shadow-key transition-colors hover:bg-surface [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

/**
 * Image unique (logo, visuel de catalogue) : une vignette qu'on remplace ou retire.
 */
export function SingleImage({
  media,
  onChange,
  label,
  hint,
  shape = 'square',
}: {
  media: MediaDto | null;
  onChange: (media: MediaDto | null) => void;
  label: string;
  hint?: string;
  shape?: 'square' | 'wide';
}) {
  const upload = useUploadImage();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = imageProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      onChange(await upload(file));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[0.8125rem] font-[600] text-ink">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'well relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl text-ink-3 transition-colors hover:text-ink',
            shape === 'square' ? 'size-20' : 'aspect-[16/9] w-40',
          )}
          aria-label={media ? `Remplacer : ${label}` : `Ajouter : ${label}`}
        >
          {media ? (
            <img src={mediaSrc(media)} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5" strokeWidth={1.6} aria-hidden />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <LoaderCircle className="size-5 animate-spin text-ink" aria-hidden />
            </span>
          )}
        </button>
        <div className="flex flex-col items-start gap-1 text-[0.8125rem] text-ink-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="font-[600] text-ink underline">
            {media ? 'Remplacer' : 'Choisir une image'}
          </button>
          {media && (
            <button type="button" onClick={() => onChange(null)} className="text-ink-2 underline hover:text-danger-ink">
              Retirer
            </button>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
