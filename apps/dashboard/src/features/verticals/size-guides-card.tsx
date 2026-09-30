import { DEFAULT_SIZE_GUIDES, type SizeGuide } from '@marche/contracts';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Select } from '@/shared/ui/field';
import { Tabs } from '@/shared/ui/tabs';
import { flattenTree, useCategories } from '../categories/api';
import { SizeGuideEditor } from './size-guide-editor';

/** Guide de départ d'une catégorie qui n'en avait pas. */
function starter(name: string): SizeGuide {
  return { title: name, columns: ['Taille', 'Tour (cm)'], rows: [['S', ''], ['M', ''], ['L', '']] };
}

/**
 * Guides des tailles par catégorie : un guide vaut pour la catégorie et ses sous-catégories.
 * Vêtements et Chaussures ont d'emblée celui proposé par Upsell ; `guides` ne garde que ceux de la boutique.
 */
export function SizeGuidesCard({
  guides,
  onChange,
  errors,
}: {
  guides: Record<string, SizeGuide>;
  onChange: (guides: Record<string, SizeGuide>) => void;
  errors: Record<string, string>;
}) {
  const categories = useCategories();
  const rows = flattenTree((categories.data ?? []).filter((category) => !category.archived));
  const bySlug = new Map(rows.map(({ category }) => [category.slug, category]));
  const slugs = [...new Set([...Object.keys(DEFAULT_SIZE_GUIDES).filter((slug) => bySlug.has(slug)), ...Object.keys(guides)])];
  const [current, setCurrent] = useState('');
  const active = slugs.includes(current) ? current : slugs[0];
  const available = rows.filter(({ category }) => !slugs.includes(category.slug));
  const guide = active ? (guides[active] ?? DEFAULT_SIZE_GUIDES[active]) : undefined;
  const withoutActive = () => Object.fromEntries(Object.entries(guides).filter(([slug]) => slug !== active));

  return (
    <Card>
      <CardHeader
        title="Guides des tailles"
        actions={
          available.length > 0 && (
            <Select
              aria-label="Ajouter un guide pour une catégorie"
              value=""
              className="h-9 text-[0.875rem]"
              onChange={(event) => {
                const category = bySlug.get(event.target.value);
                if (!category) return;
                onChange({ ...guides, [category.slug]: starter(category.name) });
                setCurrent(category.slug);
              }}
            >
              <option value="">Ajouter un guide…</option>
              {available.map(({ category, depth }) => (
                <option key={category.id} value={category.slug}>
                  {`${' '.repeat(depth)}${category.name}`}
                </option>
              ))}
            </Select>
          )
        }
      />
      <div className="flex flex-col gap-4 px-5 pb-6">
        <p className="max-w-[60ch] text-[0.875rem] text-ink-2">
          Un lien « Guide des tailles » s’affiche sur les fiches de la catégorie et de ses sous-catégories.
        </p>
        {!active || !guide ? (
          <p className="text-[0.9375rem] text-ink-2">Aucun guide pour l’instant : choisissez une catégorie dans « Ajouter un guide ».</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                label="Guide à modifier"
                items={slugs.map((slug) => ({ value: slug, label: bySlug.get(slug)?.name ?? slug }))}
                value={active}
                onChange={setCurrent}
              />
              {!DEFAULT_SIZE_GUIDES[active] && (
                <Button size="sm" variant="ghost" icon={<X />} onClick={() => onChange(withoutActive())}>
                  Retirer ce guide
                </Button>
              )}
            </div>
            <SizeGuideEditor
              key={active}
              guide={guide}
              onChange={(next) => onChange({ ...guides, [active]: next })}
              onReset={DEFAULT_SIZE_GUIDES[active] ? () => onChange(withoutActive()) : undefined}
              error={errors[`sizeGuides.${active}`]}
            />
          </>
        )}
      </div>
    </Card>
  );
}
