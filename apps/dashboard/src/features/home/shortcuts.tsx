import type { SiteDto } from '@marche/contracts';
import { Link } from '@tanstack/react-router';
import {
  ExternalLink,
  FileSpreadsheet,
  LayoutTemplate,
  type LucideIcon,
  PackagePlus,
  PanelsTopLeft,
  ReceiptText,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT, riseIn } from '@/shared/ui/motion';

const key =
  'group flex min-h-[4.25rem] min-w-0 items-center gap-3 rounded-xl bg-key px-3.5 text-left text-ink no-underline shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)] transition-[background-color,transform] duration-200 ease-out-soft hover:bg-surface-2 active:translate-y-px active:shadow-[inset_0_1px_2px_hsl(var(--shadow-color)/0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

function KeyFace({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <span className="well inline-flex size-9 shrink-0 items-center justify-center rounded-[0.6rem] text-ink-2 transition-colors group-hover:text-ink">
        <Icon className="size-[1.0625rem]" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 text-[0.875rem] leading-tight font-[600]">{label}</span>
    </>
  );
}

/**
 * Touches de fonction de l'instrument : créer et ouvrir ce qu'on fait le plus souvent, sans passer par le menu.
 * Toutes blanches : la touche orange de l'Accueil reste la prochaine commande à expédier.
 */
export function Shortcuts({ site }: { site: SiteDto | null | undefined }) {
  const keys: { id: string; node: ReactNode }[] = [
    {
      id: 'produit',
      node: (
        <Link to="/products/new" className={key}>
          <KeyFace icon={PackagePlus} label="Nouveau produit" />
        </Link>
      ),
    },
    {
      id: 'commande',
      node: (
        <Link to="/orders/new" className={key}>
          <KeyFace icon={ReceiptText} label="Nouvelle commande" />
        </Link>
      ),
    },
    {
      id: 'import',
      node: (
        <Link to="/products/import" className={key}>
          <KeyFace icon={FileSpreadsheet} label="Importer des produits" />
        </Link>
      ),
    },
    {
      id: 'section',
      node: (
        <Link to="/site" search={{ ajouter: true }} className={key}>
          <KeyFace icon={PanelsTopLeft} label="Ajouter une section" />
        </Link>
      ),
    },
    {
      id: 'modele',
      node: (
        <Link to="/templates" className={key}>
          <KeyFace icon={LayoutTemplate} label="Changer de modèle" />
        </Link>
      ),
    },
    ...(site
      ? [
          {
            id: 'site',
            node: (
              <a href={site.url} target="_blank" rel="noreferrer" className={key}>
                <KeyFace icon={ExternalLink} label="Voir mon site" />
              </a>
            ),
          },
        ]
      : []),
  ];

  return (
    <motion.nav variants={riseIn} aria-labelledby="raccourcis" className="flex flex-col gap-2.5">
      <h2 id="raccourcis" className="legend px-1">
        Raccourcis
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {keys.map((item, index) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT, delay: 0.12 + index * 0.03 } }}
            className="grid"
          >
            {item.node}
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  );
}
