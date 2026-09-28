import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ConsentReset } from '@/components/analytics';
import { getStore } from '@/lib/storefront-api';

export const metadata: Metadata = { title: 'Confidentialité' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex flex-col gap-3 text-muted">{children}</div>
    </section>
  );
}

/** Politique de confidentialité de la boutique : ce qui est recueilli, pourquoi, et comment exercer ses droits. */
export default async function PrivacyPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  const contact = [store.contactEmail, store.phone].filter(Boolean).join(' · ');

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-12 pb-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold sm:text-5xl">Confidentialité</h1>
        <p className="text-lg text-muted">
          Ce que {store.name} recueille quand vous visitez ce site ou passez commande, et ce que vous pouvez en faire.
        </p>
      </header>

      <Section title="Qui s’occupe de vos données">
        <p>
          La boutique {store.name} est responsable des données de ses clients. Le site et la gestion des commandes sont
          fournis par Upsell, qui traite ces données pour le compte de la boutique et ne s’en sert pas pour lui-même.
        </p>
      </Section>

      <Section title="Ce qui est recueilli">
        <p>
          Quand vous commandez : votre nom, votre adresse e-mail, votre téléphone, votre adresse de livraison et les
          articles commandés. Aucun compte n’est créé.
        </p>
        <p>
          Votre panier est retenu par un cookie technique, nécessaire au fonctionnement du site, qui expire au bout de
          7 jours.
        </p>
      </Section>

      <Section title="Pourquoi">
        <p>Préparer, livrer et suivre votre commande, et vous contacter à son sujet si besoin.</p>
      </Section>

      <Section title="Nouveautés sur WhatsApp">
        <p>
          Seulement si vous cochez la case prévue au moment de commander : la boutique peut alors vous envoyer ses
          nouveautés sur WhatsApp, au numéro indiqué. Répondez « STOP » à tout moment pour ne plus rien recevoir.
        </p>
      </Section>

      <Section title="Mesure d’audience">
        <p>
          Avec votre accord seulement (bandeau affiché à votre première visite), le site mesure sa fréquentation : pages
          vues, produits consultés, ajouts au panier. Ces mesures sont hébergées dans l’Union européenne. Sans accord,
          rien n’est mesuré.
        </p>
        <ConsentReset />
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez demander à consulter, corriger ou supprimer les données vous concernant, ou retirer votre accord.
          {contact ? (
            <>
              {' '}
              Contactez la boutique : <span className="text-fg">{contact}</span>.
            </>
          ) : (
            ' Contactez la boutique par les coordonnées indiquées sur ce site.'
          )}
        </p>
      </Section>
    </article>
  );
}
