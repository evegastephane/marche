import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { THEME_SCRIPT } from '@/lib/platform';
import { fontClassNames } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Upsell',
  description: 'Boutiques en ligne propulsées par Upsell.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-up-theme (thème choisi sur les pages de la plateforme) est posé avant l'hydratation.
    <html lang="fr" className={fontClassNames} suppressHydrationWarning>
      <body>
        <Script id="upsell-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
