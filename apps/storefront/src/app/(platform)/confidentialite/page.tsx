import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PlatformFooter, PlatformHeader } from '@/components/platform/chrome';
import { SIGN_IN_URL } from '@/lib/platform';

export const metadata: Metadata = { title: 'Confidentialité · Upsell' };

const CONTACT = process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="up-heading text-[1.375rem]">{title}</h2>
      <div className="flex flex-col gap-3 text-[1rem] leading-[1.65] text-[var(--up-ink-2)]">
        {children}
      </div>
    </section>
  );
}

/**
 * Politique de confidentialité de la plateforme Upsell (adresse à donner à Meta pour l'app WhatsApp).
 * Chaque boutique a en plus sa propre page, sur son site : /confidentialite.
 */
export default function PlatformPrivacy() {
  return (
    <>
      <PlatformHeader section="Confidentialité">
        <a
          href={SIGN_IN_URL}
          className="up-key"
          data-variant="ghost"
          data-size="sm"
        >
          Se connecter
        </a>
      </PlatformHeader>
      <main className="px-4 pt-12 pb-24 sm:px-6 lg:px-10 lg:pt-16">
        <article className="mx-auto flex max-w-[44rem] flex-col gap-10">
          <header className="flex flex-col gap-4">
            <h1 className="up-display-title text-[2.5rem] sm:text-[3.25rem]">
              Confidentialité
            </h1>
            <p className="text-[1.125rem] leading-[1.6] text-[var(--up-ink-2)]">
              Upsell est un logiciel de gestion de boutique : produits, stock,
              commandes et site de vente. Voici les données qu’il traite et
              pourquoi.
            </p>
          </header>

          <Section title="Les marchands">
            <p>
              Pour ouvrir et gérer une boutique : nom, adresse e-mail et
              informations de connexion (gérées par notre prestataire
              d’authentification), puis les informations de la boutique saisies
              par le marchand.
            </p>
          </Section>

          <Section title="Les clients des boutiques">
            <p>
              Quand un client commande sur le site d’une boutique : nom, e-mail,
              téléphone, adresse de livraison et articles commandés. Upsell
              traite ces données pour le compte de la boutique, qui en est
              responsable, et ne s’en sert pas pour lui-même.
            </p>
          </Section>

          <Section title="WhatsApp">
            <p>
              Une boutique peut envoyer ses nouveautés sur WhatsApp, par la
              plateforme WhatsApp Business de Meta, uniquement aux clients qui
              l’ont accepté en cochant la case prévue au moment de commander.
              Upsell reçoit de WhatsApp l’état de ces messages (envoyé, délivré,
              lu) et les réponses « STOP », qui désinscrivent aussitôt le
              numéro.
            </p>
          </Section>

          <Section title="Mesure d’audience">
            <p>
              Sur les sites des boutiques, la fréquentation n’est mesurée
              qu’avec l’accord du visiteur, et ces mesures sont hébergées dans
              l’Union européenne.
            </p>
          </Section>

          <Section title="Supprimer ses données">
            <p>
              Un client s’adresse à la boutique concernée, qui peut consulter,
              corriger ou supprimer ses données. Un marchand peut fermer sa
              boutique depuis son tableau de bord et demander la suppression
              complète de ses données.
              {CONTACT && (
                <>
                  {' '}
                  Pour toute demande à Upsell :{' '}
                  <a href={`mailto:${CONTACT}`} className="up-link">
                    {CONTACT}
                  </a>
                  .
                </>
              )}
            </p>
          </Section>
        </article>
      </main>
      <PlatformFooter />
    </>
  );
}
