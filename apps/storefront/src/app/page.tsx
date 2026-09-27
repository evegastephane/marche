import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { UpsellMark } from '@/components/upsell-mark';

// L'icône Upsell n'habille que la page de la plateforme, pas les sites des marchands.
export const metadata: Metadata = { icons: { icon: '/favicon.svg' } };

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173';
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

/** Domaine racine de la plateforme : les boutiques vivent sur leurs sous-domaines. */
export default function PlatformHome() {
  return (
    <main
      className={`${jakarta.className} relative isolate flex min-h-dvh flex-col items-start justify-center gap-7 overflow-hidden bg-[#f6f7fb] px-6 text-[#0c1a3c] sm:px-16`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 -z-10 size-[36rem] rounded-full bg-[#0b57f0] opacity-15 blur-[120px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-1/4 -z-10 size-[28rem] rounded-full bg-[#fdb52a] opacity-20 blur-[120px]"
      />
      <div className="sf-rise flex items-center gap-3">
        <UpsellMark intro className="h-12 w-auto sm:h-14" />
        <span className="text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Upsell</span>
      </div>
      <h1
        className={`${jakarta.className} sf-rise max-w-[16ch] text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] [--sf-delay:90ms] sm:text-7xl`}
      >
        Votre boutique, <span className="text-[#0b57f0]">plus haut.</span>
      </h1>
      <p className="sf-rise max-w-[46ch] text-lg text-[#4a5572] [--sf-delay:160ms]">
        Chaque boutique Upsell a son site à sa propre adresse, par exemple chez-awa.
        {process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001'}.
      </p>
      <a
        href={DASHBOARD_URL}
        className="group sf-rise inline-flex items-center gap-2 rounded-full bg-[#0b57f0] px-6 py-3.5 font-semibold text-white no-underline shadow-[0_12px_30px_-12px_#0b57f0] transition-transform duration-300 [--sf-delay:230ms] hover:-translate-y-0.5 active:scale-[0.97]"
      >
        Ouvrir le tableau de bord marchand
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </a>
    </main>
  );
}
