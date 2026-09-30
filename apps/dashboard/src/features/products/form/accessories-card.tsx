import {
  MAX_PRODUCT_ACCESSORIES,
  type ProductAccessoryDto,
} from '@marche/contracts';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { glide } from '@/shared/ui/motion';
import { ProductPicker } from '../product-picker';
import { PRODUCT_STATUS } from '../status';
import { Thumbnail } from '../thumbnail';

/**
 * Accessoires proposés sur la fiche du site : ceux choisis ici passent en premier,
 * puis (pour un appareil) ceux dont la fiche cite son modèle dans « Compatible avec ».
 */
export function AccessoriesCard({
  productId,
  device,
  model,
  accessories,
  onChange,
}: {
  productId?: string;
  /** Appareil (suivi à l'unité) : les accessoires compatibles s'ajoutent d'eux-mêmes. */
  device: boolean;
  model: string;
  accessories: ProductAccessoryDto[];
  onChange: (accessories: ProductAccessoryDto[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const exclude = new Set([...accessories.map((a) => a.id), ...(productId ? [productId] : [])]);
  const full = accessories.length >= MAX_PRODUCT_ACCESSORIES;

  return (
    <Card>
      <CardHeader
        title={device ? 'Accessoires proposés' : 'Complétez le look'}
        count={accessories.length}
        actions={
          <Button variant="ghost" size="sm" icon={<Plus />} disabled={full} onClick={() => setPicking(true)}>
            Choisir
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-5 pb-6">
        {accessories.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
            <AnimatePresence initial={false}>
              {accessories.map((accessory) => (
                <motion.li
                  key={accessory.id}
                  layout="position"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={glide}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <Thumbnail media={accessory.thumbnail} alt={accessory.title} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-[600]">{accessory.title}</span>
                    <span className="text-[0.8125rem] text-ink-2">{PRODUCT_STATUS[accessory.status].label}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 px-0 max-md:w-10"
                    aria-label={`Retirer ${accessory.title}`}
                    onClick={() => onChange(accessories.filter((a) => a.id !== accessory.id))}
                  >
                    <X />
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="text-[0.875rem] text-ink-2">
            {device
              ? 'Chargeur, écouteurs, coque… proposés avec l’appareil, ajoutés au panier d’un geste.'
              : 'Sac, bijoux, chaussures… proposés avec cet article sur votre site.'}
          </p>
        )}
        {device && (
          <p className="text-[0.8125rem] text-ink-2">
            {model.trim()
              ? `S’y ajoutent d’eux-mêmes les accessoires dont la fiche cite « ${model.trim()} » dans « Compatible avec ».`
              : 'Indiquez le modèle dans la fiche technique : les accessoires compatibles s’ajouteront d’eux-mêmes.'}
          </p>
        )}
      </div>
      <ProductPicker
        open={picking}
        onOpenChange={setPicking}
        exclude={exclude}
        title="Choisir des accessoires"
        alreadyLabel="Déjà proposé"
        onPick={(picked) =>
          onChange(
            [
              ...accessories,
              ...picked.map((p) => ({ id: p.id, title: p.title, status: p.status, thumbnail: p.thumbnail })),
            ].slice(0, MAX_PRODUCT_ACCESSORIES),
          )
        }
      />
    </Card>
  );
}
