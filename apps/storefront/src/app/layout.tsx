import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fontClassNames } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Upsell',
  description: 'Boutiques en ligne propulsées par Upsell.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={fontClassNames}>
      <body>{children}</body>
    </html>
  );
}
