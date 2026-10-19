import type { MediaDto, Section, StoreDto } from '@marche/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStoreKey } from '@/shared/api/use-api';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';
import { Tabs } from '@/shared/ui/tabs';
import { flattenTree, useCategories } from '../categories/api';
import { SingleImage } from '../media/media-gallery';
import { useMediaById } from '../settings/api';

type Patch<S extends Section> = (patch: Partial<S>) => void;
type Of<T extends Section['type']> = Extract<Section, { type: T }>;

const LIMITS = [4, 8, 12, 16, 24];
const MAX_FAQ = 12;

/** Champs d'une section ouverte dans l'éditeur, selon son type. */
export function SectionFields({
  section,
  store,
  onChange,
}: {
  section: Section;
  store: StoreDto;
  onChange: (patch: Partial<Section>) => void;
}) {
  switch (section.type) {
    case 'hero':
      return <HeroFields section={section} onChange={onChange} />;
    case 'product-grid':
      return <GridFields section={section} onChange={onChange} />;
    case 'featured-collection':
      return <CategoryFields section={section} onChange={onChange} />;
    case 'brand-strip':
      return (
        <div className="flex flex-col gap-4">
          <TitleField value={section.title} onChange={(title) => onChange({ title })} />
          <p className="text-[0.875rem] text-ink-2">Les marques des produits en vente s’affichent seules, par ordre alphabétique.</p>
        </div>
      );
    case 'rich-text':
      return (
        <div className="flex flex-col gap-4">
          <TitleField value={section.title} onChange={(title) => onChange({ title })} />
          <Field label="Texte" hint="Laissez une ligne vide entre deux paragraphes.">
            {(props) => (
              <Textarea {...props} rows={6} maxLength={5000} value={section.body} onChange={(e) => onChange({ body: e.target.value })} />
            )}
          </Field>
        </div>
      );
    case 'image-text':
      return <ImageTextFields section={section} onChange={onChange} />;
    case 'faq':
      return <FaqFields section={section} onChange={onChange} />;
    case 'contact':
      return <ContactFields section={section} store={store} onChange={onChange} />;
    default:
      return <p className="text-[0.875rem] text-ink-2">Cette section n’est plus proposée ; vous pouvez la retirer.</p>;
  }
}

function TitleField({
  value,
  onChange,
  label = 'Titre',
  placeholder,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      {(props) => (
        <Input {...props} value={value ?? ''} maxLength={120} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

/** Image d'une section : la vignette se lit par son identifiant, la nouvelle s'affiche sans attendre. */
function SectionImage({
  mediaId,
  onChange,
  label,
  hint,
}: {
  mediaId: string | null;
  onChange: (mediaId: string | null) => void;
  label: string;
  hint?: string;
}) {
  const media = useMediaById(mediaId);
  const queryClient = useQueryClient();
  const store = useStoreKey();
  return (
    <SingleImage
      label={label}
      hint={hint}
      shape="wide"
      media={media.data ?? null}
      onChange={(next: MediaDto | null) => {
        if (next) queryClient.setQueryData(['store', store, 'media', next.id], next);
        onChange(next?.id ?? null);
      }}
    />
  );
}

function HeroFields({ section, onChange }: { section: Of<'hero'>; onChange: Patch<Of<'hero'>> }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Titre" error={section.title.trim() ? undefined : 'Le titre est obligatoire.'}>
        {(props) => <Input {...props} value={section.title} maxLength={120} onChange={(e) => onChange({ title: e.target.value })} />}
      </Field>
      <Field label="Sous-titre">
        {(props) => (
          <Textarea {...props} rows={2} maxLength={300} value={section.subtitle ?? ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
        )}
      </Field>
      <Field label="Texte du bouton" hint="Il mène à tous vos produits. Vide : pas de bouton.">
        {(props) => (
          <Input {...props} value={section.ctaLabel ?? ''} maxLength={40} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        )}
      </Field>
      <SectionImage
        label="Photo"
        hint="Facultative : certains modèles montrent votre dernier produit à la place."
        mediaId={section.imageMediaId}
        onChange={(imageMediaId) => onChange({ imageMediaId })}
      />
    </div>
  );
}

function LimitSelect({ value, onChange }: { value: number; onChange: (limit: number) => void }) {
  return (
    <Field label="Nombre de produits">
      {(props) => (
        <Select {...props} value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
          {[...new Set([...LIMITS, value])]
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </Select>
      )}
    </Field>
  );
}

function GridFields({ section, onChange }: { section: Of<'product-grid'>; onChange: Patch<Of<'product-grid'>> }) {
  return (
    <div className="flex flex-col gap-4">
      <TitleField value={section.title} onChange={(title) => onChange({ title })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ordre">
          {(props) => (
            <Select
              {...props}
              value={section.sort}
              onChange={(e) => onChange({ sort: e.target.value as Of<'product-grid'>['sort'] })}
            >
              <option value="newest">Les plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </Select>
          )}
        </Field>
        <LimitSelect value={section.limit} onChange={(limit) => onChange({ limit })} />
      </div>
    </div>
  );
}

function CategoryFields({
  section,
  onChange,
}: {
  section: Of<'featured-collection'>;
  onChange: Patch<Of<'featured-collection'>>;
}) {
  const categories = useCategories();
  const rows = flattenTree(categories.data ?? []);
  const chosen = rows.find((row) => row.category.id === section.categoryId)?.category;
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Catégorie"
        hint="Ses produits en vente et ceux de ses sous-catégories."
        error={section.categoryId || section.collectionId ? undefined : 'Choisissez une catégorie.'}
      >
        {(props) => (
          <Select
            {...props}
            value={section.categoryId ?? ''}
            disabled={categories.isPending}
            onChange={(e) => {
              const next = rows.find((row) => row.category.id === e.target.value)?.category;
              // Le titre suit la catégorie tant que le marchand ne l'a pas réécrit.
              const followed = !section.title || section.title === chosen?.name || section.title === 'À la une';
              onChange({ categoryId: next?.id ?? null, collectionId: null, ...(followed && next ? { title: next.name } : {}) });
            }}
          >
            <option value="" disabled>
              {categories.isPending ? 'Chargement…' : 'Choisir une catégorie'}
            </option>
            {rows.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {`${' '.repeat(depth)}${category.name}`}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <TitleField value={section.title} onChange={(title) => onChange({ title })} placeholder={chosen?.name} />
        <LimitSelect value={section.limit} onChange={(limit) => onChange({ limit })} />
      </div>
    </div>
  );
}

function ImageTextFields({ section, onChange }: { section: Of<'image-text'>; onChange: Patch<Of<'image-text'>> }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionImage label="Photo" mediaId={section.imageMediaId} onChange={(imageMediaId) => onChange({ imageMediaId })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] font-[600]">Place de la photo</span>
        <Tabs
          label="Place de la photo"
          value={section.imagePosition}
          onChange={(imagePosition) => onChange({ imagePosition })}
          items={[
            { value: 'left', label: 'À gauche' },
            { value: 'right', label: 'À droite' },
          ]}
          className="self-start"
        />
      </div>
      <TitleField value={section.title} onChange={(title) => onChange({ title })} />
      <Field label="Texte" hint="Chaque ligne fait un paragraphe.">
        {(props) => (
          <Textarea {...props} rows={5} maxLength={1500} value={section.body} onChange={(e) => onChange({ body: e.target.value })} />
        )}
      </Field>
      <Field label="Texte du bouton" hint="Il mène à tous vos produits. Vide : pas de bouton.">
        {(props) => (
          <Input {...props} value={section.ctaLabel ?? ''} maxLength={40} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        )}
      </Field>
    </div>
  );
}

function FaqFields({ section, onChange }: { section: Of<'faq'>; onChange: Patch<Of<'faq'>> }) {
  const setItem = (id: string, patch: Partial<Of<'faq'>['items'][number]>) =>
    onChange({ items: section.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const add = () => {
    const taken = new Set(section.items.map((item) => item.id));
    let n = section.items.length + 1;
    while (taken.has(`q${n}`)) n += 1;
    onChange({ items: [...section.items, { id: `q${n}`, question: '', answer: '' }] });
  };
  return (
    <div className="flex flex-col gap-4">
      <TitleField value={section.title} onChange={(title) => onChange({ title })} />
      <ol className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {section.items.map((item, index) => (
            <motion.li
              key={item.id}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16, transition: { duration: 0.16 } }}
              transition={glide}
              className="well flex flex-col gap-3 rounded-xl p-3.5"
            >
              <div className="flex items-start gap-2">
                <Field label={`Question ${index + 1}`} className="flex-1">
                  {(props) => (
                    <Input {...props} value={item.question} maxLength={160} onChange={(e) => setItem(item.id, { question: e.target.value })} />
                  )}
                </Field>
                <button
                  type="button"
                  aria-label={`Retirer la question ${index + 1}`}
                  onClick={() => onChange({ items: section.items.filter((other) => other.id !== item.id) })}
                  className="mt-6 inline-flex size-10 shrink-0 items-center justify-center rounded-[0.7rem] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <X className="size-4" strokeWidth={1.8} />
                </button>
              </div>
              <Field
                label="Réponse"
                hint={item.answer.trim() ? undefined : 'Sans réponse, la question reste cachée sur le site.'}
              >
                {(props) => (
                  <Textarea {...props} rows={3} maxLength={1000} value={item.answer} onChange={(e) => setItem(item.id, { answer: e.target.value })} />
                )}
              </Field>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {section.items.length < MAX_FAQ && (
        <button
          type="button"
          onClick={add}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[0.875rem] font-[600] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
        >
          <Plus className="size-4" strokeWidth={1.8} aria-hidden /> Ajouter une question
        </button>
      )}
    </div>
  );
}

function ContactFields({
  section,
  store,
  onChange,
}: {
  section: Of<'contact'>;
  store: StoreDto;
  onChange: Patch<Of<'contact'>>;
}) {
  const channels: { key: 'showWhatsapp' | 'showPhone' | 'showEmail'; label: string; value: string | null }[] = [
    { key: 'showWhatsapp', label: 'Bouton WhatsApp', value: store.phone },
    { key: 'showPhone', label: 'Téléphone', value: store.phone },
    { key: 'showEmail', label: 'E-mail', value: store.contactEmail },
  ];
  return (
    <div className="flex flex-col gap-4">
      <TitleField value={section.title} onChange={(title) => onChange({ title })} />
      <Field label="Phrase d’accueil">
        {(props) => (
          <Input {...props} value={section.subtitle ?? ''} maxLength={300} onChange={(e) => onChange({ subtitle: e.target.value })} />
        )}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[0.8125rem] font-[600]">Moyens de vous joindre</legend>
        {channels.map((channel) => (
          <label key={channel.key} className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
            <Switch checked={section[channel.key]} onChange={(on) => onChange({ [channel.key]: on })} />
            <span className="flex min-w-0 flex-col">
              <span className="font-[600]">{channel.label}</span>
              <span className="truncate text-[0.8125rem] text-ink-2">
                {channel.value ?? (
                  <>
                    Non renseigné ·{' '}
                    <Link to="/settings" className="font-[600] text-ink underline underline-offset-4">
                      Paramètres
                    </Link>
                  </>
                )}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adresse" hint="Facultative.">
          {(props) => (
            <Input
              {...props}
              value={section.address ?? ''}
              maxLength={160}
              placeholder="Marché Sandaga, Dakar"
              onChange={(e) => onChange({ address: e.target.value })}
            />
          )}
        </Field>
        <Field label="Horaires" hint="Facultatifs.">
          {(props) => (
            <Input
              {...props}
              value={section.hours ?? ''}
              maxLength={160}
              placeholder="Lun–Sam, 9 h – 19 h"
              onChange={(e) => onChange({ hours: e.target.value })}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
