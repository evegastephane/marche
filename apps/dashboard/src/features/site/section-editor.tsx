import {
  type AddableSectionType,
  getTemplate,
  newSection,
  type Section,
  type StoreDto,
  type ThemeSettings,
} from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, type LucideIcon, Megaphone, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/cn';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { EASE_OUT, glide } from '@/shared/ui/motion';
import { Switch } from '@/shared/ui/switch';
import { useCategories } from '../categories/api';
import { AddSectionDialog } from './add-section-dialog';
import { kindOf, sectionGap, sectionSummary } from './section-catalog';
import { SectionFields } from './section-fields';

const HEADER_ID = '__en-tete';

/**
 * L'éditeur de la page d'accueil : une pile de sections qu'on ouvre sur place, réordonne,
 * masque ou retire ; une touche « + » entre deux sections et un emplacement en pointillé
 * en bas pour en ajouter. Chaque ouverture fait défiler l'aperçu jusqu'à la section.
 */
export function SectionEditor({
  settings,
  edit,
  store,
  onFocus,
}: {
  settings: ThemeSettings;
  edit: (next: (current: ThemeSettings) => ThemeSettings) => void;
  store: StoreDto;
  onFocus: (sectionId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const categories = useCategories();
  const categoryName = (id: string) => categories.data?.find((c) => c.id === id)?.name;
  const sections = settings.sections;
  const template = getTemplate(settings.template);

  const setSections = (change: (sections: Section[]) => Section[]) =>
    edit((current) => ({ ...current, sections: change(current.sections) }));

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && next !== HEADER_ID) onFocus(next);
  };

  const move = (index: number, delta: number) =>
    setSections((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    });

  const remove = (section: Section, index: number) => {
    setSections((list) => list.filter((s) => s.id !== section.id));
    if (openId === section.id) setOpenId(null);
    toast(`« ${kindOf(section).name} » retirée`, {
      action: {
        label: 'Annuler',
        onClick: () =>
          setSections((list) =>
            list.some((s) => s.id === section.id) ? list : [...list.slice(0, index), section, ...list.slice(index)],
          ),
      },
    });
  };

  const add = (type: AddableSectionType) => {
    const at = insertAt ?? sections.length;
    const section = newSection(type, sections, store.name);
    setSections((list) => [...list.slice(0, at), section, ...list.slice(at)]);
    setInsertAt(null);
    setOpenId(section.id);
    onFocus(section.id);
  };

  return (
    <section className="panel overflow-hidden" aria-labelledby="page-accueil">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 pb-3">
        <h2 id="page-accueil" className="heading flex items-center gap-2.5 text-[1rem]">
          Votre page d’accueil
          <span className="tabular text-[0.875rem] font-[500] text-ink-3">{sections.length}</span>
        </h2>
        <Link
          to="/templates"
          className="group inline-flex min-h-9 items-center gap-1.5 text-[0.8125rem] text-ink-2 no-underline hover:text-ink"
        >
          Modèle : <span className="font-[600] text-ink">{template?.manifest.name ?? 'Natif'}</span>
          <span className="font-[600] underline decoration-line-strong underline-offset-4 group-hover:decoration-ink">Changer</span>
        </Link>
      </div>

      <div className="border-t border-line">
        <Row
          icon={Megaphone}
          name="En-tête et bandeau"
          summary={settings.announcement.enabled ? settings.announcement.text || 'Bandeau sans texte' : 'Sans bandeau d’annonce'}
          open={openId === HEADER_ID}
          onToggle={() => toggle(HEADER_ID)}
        >
          <AnnouncementFields settings={settings} edit={edit} />
        </Row>

        <Reorder.Group
          axis="y"
          as="ol"
          values={sections.map((s) => s.id)}
          onReorder={(ids: string[]) =>
            setSections((list) => ids.map((id) => list.find((s) => s.id === id)).filter((s): s is Section => s !== undefined))
          }
        >
          <AnimatePresence initial={false}>
            {sections.map((section, index) => (
              <SectionRow
                key={section.id}
                section={section}
                index={index}
                count={sections.length}
                open={openId === section.id}
                summary={sectionSummary(section, categoryName)}
                gap={sectionGap(section, store)}
                onToggle={() => toggle(section.id)}
                onInsertBefore={() => setInsertAt(index)}
                onMove={(delta) => move(index, delta)}
                onRemove={() => remove(section, index)}
                onEnabled={(enabled) => setSections((list) => list.map((s) => (s.id === section.id ? { ...s, enabled } : s)))}
              >
                <SectionFields
                  section={section}
                  store={store}
                  onChange={(patch) =>
                    setSections((list) => list.map((s) => (s.id === section.id ? ({ ...s, ...patch } as Section) : s)))
                  }
                />
              </SectionRow>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => setInsertAt(sections.length)}
          className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[0.9375rem] font-[600] text-ink-2 transition-colors duration-200 hover:border-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] transition-transform duration-200 group-hover:-translate-y-px">
            <Plus className="size-4" strokeWidth={2} aria-hidden />
          </span>
          Ajouter une section
        </button>
      </div>

      <AddSectionDialog
        open={insertAt !== null}
        onOpenChange={(open) => !open && setInsertAt(null)}
        sections={sections}
        onPick={add}
      />
    </section>
  );
}

/** Rangée dépliable : pictogramme en creux, nom, résumé ; le contenu s'ouvre sur place. */
function Row({
  icon: Icon,
  name,
  summary,
  open,
  onToggle,
  leading,
  trailing,
  gap,
  children,
}: {
  icon: LucideIcon;
  name: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  gap?: { message: string; fix?: 'settings' } | null;
  children: ReactNode;
}) {
  return (
    <div className={cn('transition-colors duration-200', open && 'bg-surface-2/60')}>
      <div className="flex items-center gap-1 pr-3 pl-1.5 sm:pr-4">
        {leading ?? <span className="w-9 shrink-0" aria-hidden />}
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-[0.7rem] py-2 pr-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="well inline-flex size-10 shrink-0 items-center justify-center rounded-[0.7rem] text-ink-2">
            <Icon className="size-[1.125rem]" strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-[600]">{name}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-ink-2">
              {gap && <Led tone="draft" />}
              <span className="truncate">{gap ? 'À compléter' : summary}</span>
            </span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-ink-3 transition-transform duration-300 ease-out-soft', open && 'rotate-180')}
            strokeWidth={1.8}
            aria-hidden
          />
        </button>
        {trailing}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.32, ease: EASE_OUT } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 px-5 pt-1 pb-5 sm:pl-[3.75rem]">
              {gap && (
                <p className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
                  <Led tone="draft" />
                  {gap.message}
                  {gap.fix === 'settings' && (
                    <Link to="/settings" className="font-[600] text-ink underline underline-offset-4">
                      Ouvrir les Paramètres
                    </Link>
                  )}
                </p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionRow({
  section,
  index,
  count,
  open,
  summary,
  gap,
  onToggle,
  onInsertBefore,
  onMove,
  onRemove,
  onEnabled,
  children,
}: {
  section: Section;
  index: number;
  count: number;
  open: boolean;
  summary: string;
  gap: { message: string; fix?: 'settings' } | null;
  onToggle: () => void;
  onInsertBefore: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onEnabled: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const kind = kindOf(section);
  return (
    <Reorder.Item
      value={section.id}
      as="li"
      dragListener={false}
      dragControls={controls}
      transition={glide}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
      whileDrag={{ scale: 1.01, boxShadow: '0 14px 30px -14px rgb(16 17 21 / 0.35)', zIndex: 5 }}
      className="group/row relative border-t border-line bg-surface"
    >
      {/* Insérer ici : au survol à la souris, toujours visible au doigt. */}
      <button
        type="button"
        onClick={onInsertBefore}
        aria-label={`Ajouter une section avant « ${kind.name} »`}
        className="absolute -top-3.5 left-1/2 z-10 inline-flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-key text-ink-2 shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] transition-[opacity,color] duration-200 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100"
      >
        <Plus className="size-3.5" strokeWidth={2.2} />
      </button>
      <Row
        icon={kind.icon}
        name={kind.name}
        summary={summary}
        open={open}
        onToggle={onToggle}
        gap={gap}
        leading={
          <button
            type="button"
            aria-label={`Déplacer « ${kind.name} » (flèches haut et bas)`}
            onPointerDown={(event) => controls.start(event)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' && index > 0) {
                event.preventDefault();
                onMove(-1);
              } else if (event.key === 'ArrowDown' && index < count - 1) {
                event.preventDefault();
                onMove(1);
              }
            }}
            className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="size-4" strokeWidth={1.8} />
          </button>
        }
        trailing={
          <label className="flex min-h-11 cursor-pointer items-center gap-2 pl-2" title={section.enabled ? 'Visible sur le site' : 'Masquée'}>
            <span className="sr-only">Visible sur le site : {kind.name}</span>
            <Switch checked={section.enabled} onChange={onEnabled} />
          </label>
        }
      >
        <div className={cn('flex flex-col gap-5', !section.enabled && 'opacity-60')}>
          {!section.enabled && (
            <p className="text-[0.8125rem] text-ink-2">Masquée : elle reste ici, sans paraître sur le site.</p>
          )}
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
          <Button variant="ghost" size="sm" icon={<ArrowUp strokeWidth={1.8} />} disabled={index === 0} onClick={() => onMove(-1)}>
            Monter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowDown strokeWidth={1.8} />}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            Descendre
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 strokeWidth={1.8} />}
            onClick={onRemove}
            className="ml-auto hover:text-danger-ink"
          >
            Retirer
          </Button>
        </div>
      </Row>
    </Reorder.Item>
  );
}

function AnnouncementFields({
  settings,
  edit,
}: {
  settings: ThemeSettings;
  edit: (next: (current: ThemeSettings) => ThemeSettings) => void;
}) {
  const set = (patch: Partial<ThemeSettings['announcement']>) =>
    edit((current) => ({ ...current, announcement: { ...current.announcement, ...patch } }));
  return (
    <div className="flex flex-col gap-4">
      <label className="well flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3">
        <Switch checked={settings.announcement.enabled} onChange={(enabled) => set({ enabled })} />
        <span className="flex flex-col">
          <span className="font-[600]">Bandeau d’annonce</span>
          <span className="text-[0.875rem] text-ink-2">Une ligne en haut de chaque page : livraison, horaires…</span>
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
                  onChange={(e) => set({ text: e.target.value })}
                />
              )}
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-[0.8125rem] text-ink-2">
        Le logo et le nom viennent des{' '}
        <Link to="/settings" className="font-[600] text-ink underline underline-offset-4">
          Paramètres
        </Link>
        .
      </p>
    </div>
  );
}
