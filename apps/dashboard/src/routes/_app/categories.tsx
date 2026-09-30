import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { z } from 'zod';
import { useCategories } from '@/features/categories/api';
import { AttributesView } from '@/features/categories/attributes-view';
import { CategoriesView } from '@/features/categories/categories-view';
import { AttributeDialog, CategoryDialog } from '@/features/categories/dialogs';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({
  tab: z.enum(['categories', 'attributes']).optional().catch(undefined),
  id: z.uuid().optional().catch(undefined),
  attribute: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/categories')({
  validateSearch: searchSchema,
  component: Categories,
});

function Categories() {
  const { tab = 'categories', id, attribute } = Route.useSearch();
  const navigate = Route.useNavigate();
  const categories = useCategories(true);
  const [creating, setCreating] = useState<'category' | 'attribute' | null>(null);
  const onAttributes = tab === 'attributes';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catégories"
        subtitle="L’arbre du catalogue et les attributs de chaque rayon : ils décident de la fiche technique, des variantes et des filtres du site."
        actions={
          <Button variant="primary" icon={<Plus strokeWidth={1.8} />} onClick={() => setCreating(onAttributes ? 'attribute' : 'category')}>
            {onAttributes ? 'Nouvel attribut' : 'Nouvelle catégorie'}
          </Button>
        }
      />
      <motion.div variants={riseIn}>
        <Tabs
          label="Catégories ou attributs"
          items={[
            { value: 'categories' as const, label: 'Catégories' },
            { value: 'attributes' as const, label: 'Attributs' },
          ]}
          value={tab}
          onChange={(next) => void navigate({ search: (prev) => ({ ...prev, tab: next === 'categories' ? undefined : next }), replace: true })}
          className="self-start"
        />
      </motion.div>

      {onAttributes ? (
        <AttributesView
          selectedId={attribute}
          onSelect={(next) => void navigate({ search: (prev) => ({ ...prev, attribute: next }), replace: true })}
        />
      ) : (
        <CategoriesView selectedId={id} onSelect={(next) => void navigate({ search: (prev) => ({ ...prev, id: next }), replace: true })} />
      )}

      <CategoryDialog
        open={creating === 'category'}
        onOpenChange={(open) => setCreating(open ? 'category' : null)}
        categories={categories.data ?? []}
        defaultParentId={id}
        onCreated={(category) => void navigate({ search: (prev) => ({ ...prev, id: category.id }) })}
      />
      <AttributeDialog
        open={creating === 'attribute'}
        onOpenChange={(open) => setCreating(open ? 'attribute' : null)}
        onCreated={(created) => void navigate({ search: (prev) => ({ ...prev, attribute: created.id }) })}
      />
    </div>
  );
}
