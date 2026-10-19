import './home.css';
import type { Metadata } from 'next';
import { Chapter } from '@/components/home/chapter';
import { HomeFooter, HomeHeader } from '@/components/home/chrome';
import { Closing } from '@/components/home/closing';
import { CounterDemo } from '@/components/home/counter';
import { Hero } from '@/components/home/hero';
import { PublishDemo } from '@/components/home/publish';
import { Rest } from '@/components/home/rest';
import { SheetMotion } from '@/components/home/sheets';
import { Stage } from '@/components/home/stage';
import { HomeProvider } from '@/components/home/state';
import { Thread } from '@/components/home/thread';
import { WaxDefs } from '@/components/home/wax';
import { WhatsAppDemo } from '@/components/home/whatsapp';

export const metadata: Metadata = {
  title: {
    absolute: 'Upsell · Votre boutique, en un clic',
  },
  description:
    'Le dashboard, le site, la caisse et WhatsApp, tenus par le même stock : générez votre boutique en ligne en un clic.',
};

/**
 * Accueil de la plateforme (domaine racine ; les boutiques vivent sur leurs sous-domaines).
 * « Le chariot en pièces » : l'emblème démonté sert de décor, le vrai produit se manipule à chaque chapitre.
 */
export default function PlatformHome() {
  return (
    <HomeProvider>
      <div className="uh">
        <script
          // Posée avant le premier affichage : ce qui entre en scène reste caché jusqu'à l'animation.
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('uh-js')",
          }}
        />
        <WaxDefs />
        <Stage />
        <SheetMotion />
        <HomeHeader />
        <main>
          <Thread />
          <Hero />
          <Chapter
            id="publiez"
            paper
            title="Publiez"
            lede="Votre catalogue devient votre site, en direct. Un clic, sans développeur."
          >
            <PublishDemo />
          </Chapter>
          <Chapter
            id="caisse"
            title="Encaissez"
            lede="Au comptoir, la vente sort du même stock que le site. Le ticket s’imprime ; la facture arrive bientôt."
          >
            <CounterDemo />
          </Chapter>
          <Chapter
            id="campagnes"
            paper
            title="Annoncez"
            lede="Une nouveauté part sur WhatsApp, vers les clients qui l’ont accepté. Un STOP suffit à les retirer."
          >
            <WhatsAppDemo />
          </Chapter>
          <Chapter
            id="reste"
            title="Tout le reste"
            lede="Ce qu’une boutique demande chaque jour, déjà prêt."
            wide
            thread={false}
          >
            <Rest />
          </Chapter>
          <Closing />
        </main>
        <HomeFooter />
      </div>
    </HomeProvider>
  );
}
