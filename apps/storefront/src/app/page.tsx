import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';

// L'icône Upsell n'habille que la page de la plateforme, pas les sites des marchands.
export const metadata: Metadata = { icons: { icon: '/favicon.svg' } };

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001';
const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap' });

/**
 * Domaine racine de la plateforme (les boutiques vivent sur leurs sous-domaines).
 * Même monde que le dashboard : boîtier clair ou noir, afficheur noir, une seule touche orange.
 */
export default function PlatformHome() {
  return (
    <main
      className={`${hanken.className} flex min-h-dvh flex-col justify-center gap-12 bg-[#f2f2ef] px-6 py-16 text-[#101115] sm:px-16 dark:bg-[#0c0c0e] dark:text-[#f2f2ef]`}
    >
      <span role="img" aria-label="Upsell" className="sf-rise inline-flex items-center gap-[0.32em] self-start text-[2rem]">
        <UpsellMark intro className="h-[1.18em] w-auto" />
        <UpsellWordmark className="translate-y-[0.14em]" />
      </span>

      <div className="grid max-w-6xl items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className="flex flex-col items-start gap-6">
          <h1 className="sf-rise max-w-[14ch] text-5xl leading-[1.02] font-bold tracking-[-0.03em] [--sf-delay:80ms] sm:text-7xl">
            Votre boutique, plus haut.
          </h1>
          <p className="sf-rise max-w-[46ch] text-lg text-[#4a4c54] [--sf-delay:140ms] dark:text-[#abacb2]">
            Produits, stock et commandes au même endroit. Chaque boutique a son site à sa propre adresse, mis en ligne
            en un clic et tenu à jour par le stock.
          </p>
          <a
            href={DASHBOARD_URL}
            className="group sf-rise inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#f66b21] px-5 font-semibold text-[#101115] no-underline shadow-[0_1px_0_rgb(16_17_21/0.16),0_2px_4px_-1px_rgb(16_17_21/0.08)] transition-[background-color,transform] duration-200 [--sf-delay:200ms] hover:bg-[#ea5d12] active:translate-y-px"
          >
            Ouvrir le tableau de bord marchand
            <ArrowRight
              aria-hidden
              className="size-[1.1em] transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={1.8}
            />
          </a>
        </div>

        <div className="sf-rise flex flex-col gap-5 rounded-2xl bg-[#e8e9e3] p-6 text-[#101115] shadow-[inset_0_2px_3px_rgb(16_17_21/0.08),inset_0_0_0_1px_rgb(16_17_21/0.12)] [--sf-delay:260ms] sm:p-7 dark:bg-[#060607] dark:text-[#f4f4f1] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_0_0_1px_rgb(255_255_255/0.08)]">
          <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-[#5d5f66] uppercase dark:text-[#9a9ca3]">
            Exemple d’adresse
          </span>
          <span className="text-[1.375rem] leading-tight font-light tracking-[-0.02em] break-all tabular-nums sm:text-[1.625rem]">
            chez-awa.{ROOT_DOMAIN}
          </span>
          <span className="flex items-center gap-2.5 border-t border-black/10 pt-4 text-[0.875rem] text-[#5d5f66] dark:border-white/10 dark:text-[#9a9ca3]">
            <span aria-hidden className="size-2 rounded-full bg-[#101115] dark:bg-[#f4f4f1] dark:shadow-[0_0_8px_rgb(255_255_255/0.55)]" />
            En ligne, avec le stock à jour
          </span>
        </div>
      </div>
    </main>
  );
}
