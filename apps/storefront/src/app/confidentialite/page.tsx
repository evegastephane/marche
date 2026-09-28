import type { Metadata } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { UpsellMark, UpsellWordmark } from '@/components/upsell-mark';

export const metadata: Metadata = {
  title: 'Confidentialité · Upsell',
  icons: { icon: '/favicon.svg' },
};

const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap' });
const CONTACT = process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-[-0.015em]">{title}</h2>
      <div className="flex flex-col gap-3 text-[#4a4c54] dark:text-[#abacb2]">{children}</div>
    </section>
  );
}

/**
 * Politique de confidentialité de la plateforme Upsell (adresse à donner à Meta pour l'app WhatsApp).
 * Chaque boutique a en plus sa propre page, sur son site : /confidentialite.
 */
export default function PlatformPrivacy() {
  return (
    <main
      className={`${hanken.className} min-h-dvh bg-[#f2f2ef] px-6 py-14 text-[#101115] sm:px-16 dark:bg-[#0c0c0e] dark:text-[#f2f2ef]`}
    >
      <article className="mx-auto flex max-w-3xl flex-col gap-10">
        <Link href="/" aria-label="Upsell, accueil" className="inline-flex items-center gap-[0.32em] self-start text-[1.5rem] text-inherit">
          <UpsellMark className="h-[1.18em] w-auto" />
          <UpsellWordmark className="translate-y-[0.14em]" />
        </Link>
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">Confidentialité</h1>
          <p className="text-lg text-[#4a4c54] dark:text-[#abacb2]">
            Upsell est un logiciel de gestion de boutique : produits, stock, commandes et site de vente. Voici les données
            qu’il traite et pourquoi.
          </p>
        </header>

        <Section title="Les marchands">
          <p>
            Pour ouvrir et gérer une boutique : nom, adresse e-mail et informations de connexion (gérées par notre
            prestataire d’authentification), puis les informations de la boutique saisies par le marchand.
          </p>
        </Section>

        <Section title="Les clients des boutiques">
          <p>
            Quand un client commande sur le site d’une boutique : nom, e-mail, téléphone, adresse de livraison et articles
            commandés. Upsell traite ces données pour le compte de la boutique, qui en est responsable, et ne s’en sert pas
            pour lui-même.
          </p>
        </Section>

        <Section title="WhatsApp">
          <p>
            Une boutique peut envoyer ses nouveautés sur WhatsApp, par la plateforme WhatsApp Business de Meta, uniquement
            aux clients qui l’ont accepté en cochant la case prévue au moment de commander. Upsell reçoit de WhatsApp l’état
            de ces messages (envoyé, délivré, lu) et les réponses « STOP », qui désinscrivent aussitôt le numéro.
          </p>
        </Section>

        <Section title="Mesure d’audience">
          <p>
            Sur les sites des boutiques, la fréquentation n’est mesurée qu’avec l’accord du visiteur, et ces mesures sont
            hébergées dans l’Union européenne.
          </p>
        </Section>

        <Section title="Supprimer ses données">
          <p>
            Un client s’adresse à la boutique concernée, qui peut consulter, corriger ou supprimer ses données. Un marchand
            peut fermer sa boutique depuis son tableau de bord et demander la suppression complète de ses données.
            {CONTACT && (
              <>
                {' '}
                Pour toute demande à Upsell : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
              </>
            )}
          </p>
        </Section>
      </article>
    </main>
  );
}
