import { type StoreDto, type StoreType, templatesForStore } from '@marche/contracts';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Led } from '@/shared/ui/badge';

/** Adresse de l'équipe pour activer Premium, tant que le paiement en ligne n'existe pas (rien si absente). */
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || null;

/** Modèles Premium proposés à ce type de boutique. */
export function premiumCount(storeType: StoreType): number {
  return templatesForStore(storeType).filter((t) => t.manifest.tier === 'premium').length;
}

/** Ce que Premium débloque, et comment l'obtenir tant que le paiement en ligne n'existe pas. */
export function PremiumDialog({
  open,
  onOpenChange,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreDto;
}) {
  const premium = templatesForStore(store.type).filter((t) => t.manifest.tier === 'premium');
  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Formule Premium pour ${store.name}`)}&body=${encodeURIComponent(
        `Bonjour,\n\nJe souhaite passer la boutique « ${store.name} » (${store.slug}) en formule Premium.\n`,
      )}`
    : null;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Passer à Premium"
      description="Premium débloque tous les modèles de votre type de boutique. Vos sections, vos produits et vos réglages restent tels quels : seul l’habillage change."
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {premium.map((t) => (
          <li key={t.manifest.id} className="flex items-center gap-2 text-[0.875rem]">
            <Led tone="on" />
            {t.manifest.name}
          </li>
        ))}
      </ul>
      <p className="well rounded-xl px-4 py-3 text-[0.875rem] text-ink-2">
        Le paiement en ligne arrive bientôt. En attendant, l’équipe Upsell active Premium sur demande.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
        {mailto && (
          <a href={mailto} className={buttonClasses('primary')}>
            Écrire à l’équipe Upsell
          </a>
        )}
      </div>
    </Dialog>
  );
}
