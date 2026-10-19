import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PortalNav } from '@/components/developers/portal-nav';
import { PlatformFooter, PlatformHeader } from '@/components/platform/chrome';
import { DASHBOARD_URL } from '@/lib/platform';

export const metadata: Metadata = {
  title: {
    default: 'Développeurs · Upsell',
    template: '%s · Développeurs Upsell',
  },
  description:
    'Branchez n’importe quel site, application ou serveur sur une boutique Upsell : clés pk_ et sk_, référence des API.',
};

/** Portail Développeurs : l'en-tête de la plateforme, avec la navigation du portail. */
export default function DevelopersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <PlatformHeader section="Développeurs">
        <PortalNav />
        <a
          href={DASHBOARD_URL}
          className="up-key max-lg:hidden"
          data-variant="ghost"
          data-size="sm"
        >
          Tableau de bord
        </a>
      </PlatformHeader>
      {children}
      <PlatformFooter />
    </>
  );
}
