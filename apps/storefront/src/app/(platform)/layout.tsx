import './platform.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hanken } from '@/lib/platform-font';

// L'icône Upsell n'habille que les pages de la plateforme, pas les sites des marchands.
export const metadata: Metadata = { icons: { icon: '/favicon.svg' } };

/**
 * Pages du domaine racine : l'accueil (sa propre scène, components/home), le portail Développeurs et la
 * confidentialité (le monde « L'instrument », avec le pied de page commun).
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${hanken.className} up-platform flex min-h-dvh flex-col`}>
      <div className="flex-1">{children}</div>
    </div>
  );
}
