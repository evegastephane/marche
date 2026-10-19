import { Link } from '@tanstack/react-router';
import { Inbox, type LucideIcon, Megaphone, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { Led } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';

export interface SoonFeature {
  path: '/pos' | '/requests' | '/campaigns';
  name: string;
  icon: LucideIcon;
  /** Ce que la rubrique fera, en une phrase. */
  promise: string;
}

/**
 * Rubriques en préparation : elles restent dans le menu, éteintes, et leur page l'annonce.
 * Leur code est en place ; retirer une entrée de cette liste suffit à la rouvrir.
 */
export const SOON_FEATURES: readonly SoonFeature[] = [
  {
    path: '/pos',
    name: 'Caisse',
    icon: Wallet,
    promise: 'Encaisser au comptoir, scanner les codes-barres et les IMEI, imprimer les tickets, avec le même stock que le site.',
  },
  {
    path: '/requests',
    name: 'Demandes',
    icon: Inbox,
    promise: 'Les demandes de vos clients depuis le site (articles absents du stock, reprises) arriveront ici, prêtes à devenir des commandes.',
  },
  {
    path: '/campaigns',
    name: 'Campagnes',
    icon: Megaphone,
    promise: 'Écrire en une fois aux clients qui l’ont accepté, sur WhatsApp : nouveautés, arrivages, promotions.',
  },
];

/** La rubrique en préparation qui couvre cette adresse, s'il y en a une. */
export function soonFeatureAt(pathname: string): SoonFeature | undefined {
  return SOON_FEATURES.find((feature) => pathname === feature.path || pathname.startsWith(`${feature.path}/`));
}

/** Page d'une rubrique en préparation : ce qu'elle fera, et le chemin du retour. */
export function ComingSoon({ feature }: { feature: SoonFeature }) {
  const Icon = feature.icon;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={feature.name} />
      <motion.section variants={riseIn} className="panel flex flex-col items-start gap-5 p-6 sm:p-10">
        <span className="well inline-flex size-12 items-center justify-center rounded-[0.8rem] text-ink-2">
          <Icon className="size-[1.375rem]" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="heading flex items-center gap-2.5 text-[1.25rem]">
            <Led tone="draft" />
            Bientôt disponible
          </h2>
          <p className="max-w-[52ch] text-[1.0625rem] text-ink-2">{feature.promise}</p>
        </div>
        <Link to="/" className={buttonClasses('secondary')}>
          Revenir à l’accueil
        </Link>
      </motion.section>
    </div>
  );
}
