'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { type CSSProperties, useRef, useState } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';
import { SplitReveal } from './reactbits/split-reveal';
import { WindowDisplay } from './window-displays';

type Front = 'caisson' | 'lettres' | 'store';

/** Couleurs des stores, prises aux pagnes des produits d'exemple. */
const AWNINGS = {
  indigo: ['#1d3b6f', '#efe3cc'],
  terre: ['#b8492a', '#efe3cc'],
  feuille: ['#2f6b4f', '#d9a441'],
} as const;

const SHOPS: {
  name: string;
  text: string;
  front: Front;
  awning?: keyof typeof AWNINGS;
  width: number;
  link?: { href: string; label: string };
}[] = [
  {
    name: 'Catalogue',
    front: 'caisson',
    width: 380,
    text: 'Vos catégories et vos champs : taille, pointure, stockage, couleur. Les variantes et leurs SKU se créent d’un coup.',
  },
  {
    name: 'Stock',
    front: 'store',
    awning: 'indigo',
    width: 330,
    text: 'Un journal de chaque mouvement, une alerte quand un article baisse, la réservation dès la commande.',
  },
  {
    name: 'Appareils',
    front: 'lettres',
    width: 360,
    text: 'Un IMEI ou un numéro de série par pièce, noté à l’arrivée, retrouvé à la vente.',
  },
  {
    name: 'Commandes',
    front: 'caisson',
    width: 400,
    text: 'Passées sur votre site ou saisies par vous, payées à la livraison ou par virement, marquées d’un geste.',
  },
  {
    name: 'Demandes',
    front: 'store',
    awning: 'terre',
    width: 360,
    text: 'Ce que vos clients demandent depuis le site : vous faites une offre, puis vous la transformez en commande.',
  },
  {
    name: 'Clients',
    front: 'lettres',
    width: 320,
    text: 'Créés à la commande, avec leurs achats et leur accord pour recevoir vos messages.',
  },
  {
    name: 'Caisse',
    front: 'caisson',
    width: 330,
    text: 'Sessions, tickets, retours et avoirs, sur le même stock que le site.',
  },
  {
    name: 'Site',
    front: 'store',
    awning: 'feuille',
    width: 360,
    text: 'Votre adresse, huit thèmes au choix, en ligne d’un clic et tenu à jour par votre stock.',
  },
  {
    name: 'Campagnes',
    front: 'lettres',
    width: 380,
    text: 'Vos nouveautés sur WhatsApp, envoyées aux clients qui ont accepté de les recevoir.',
  },
  {
    name: 'Import Excel',
    front: 'caisson',
    width: 420,
    text: 'Tout un catalogue d’un coup, vérifié ligne par ligne avant que rien ne soit écrit.',
  },
  {
    name: 'Équipe',
    front: 'store',
    awning: 'indigo',
    width: 340,
    text: 'Vos vendeurs avec leur rôle, et plusieurs boutiques sous un seul compte.',
  },
  {
    name: 'API',
    front: 'lettres',
    width: 360,
    text: 'Pour brancher votre propre site, une application ou vos outils sur la boutique.',
    link: { href: '/developers', label: 'Portail Développeurs' },
  },
];

/**
 * La rue des enseignes : chaque fonction est une devanture. En défilant, la rue passe de droite à gauche et
 * l'enseigne qui arrive au milieu s'allume ; une seule à la fois. Sans mouvement (ou sans JavaScript), la rue
 * se parcourt au doigt ou à la molette, et l'enseigne survolée s'allume.
 */
export function Street() {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  const [pointed, setPointed] = useState<number | null>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(MOTION_OK, () => {
        const row = track.current;
        const frame = viewport.current;
        if (!row || !frame) return;
        gsap.set(frame, { overflowX: 'hidden' });
        const distance = () => Math.max(0, row.scrollWidth - frame.clientWidth);
        const walk = gsap.to(row, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        const shops = gsap.utils.toArray<HTMLElement>('.ul-shop', row);
        shops.forEach((shop, index) => {
          ScrollTrigger.create({
            trigger: shop,
            containerAnimation: walk,
            start: 'left 58%',
            end: 'right 42%',
            onToggle: (self) => {
              if (self.isActive) setLit(index);
            },
          });
        });
      });
      return () => media.revert();
    },
    { scope: section },
  );

  const shown = pointed ?? lit;
  return (
    <section
      ref={section}
      id="fonctions"
      aria-labelledby="rue-titre"
      className="relative isolate flex min-h-[100svh] scroll-mt-16 flex-col overflow-hidden bg-[var(--ul-night)] pt-24 sm:pt-28"
    >
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-4 px-4 pb-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-10">
        <SplitReveal
          id="rue-titre"
          className="ul-display max-w-[14ch] text-[clamp(2.3rem,4.6vw,4rem)]"
        >
          Tout le reste, sous la même enseigne.
        </SplitReveal>
        <p className="ul-lede max-w-[30rem]">
          Au téléphone pour les commandes, à l’ordinateur pour le catalogue : un
          seul compte, les mêmes chiffres.
        </p>
      </div>
      <div
        ref={viewport}
        className="relative flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        <div
          ref={track}
          className="flex h-full min-h-[27rem] w-max items-stretch px-4 sm:px-6 lg:px-[max(2.5rem,calc((100vw-78rem)/2+2.5rem))]"
          onPointerLeave={() => setPointed(null)}
        >
          {SHOPS.map((shop, index) => (
            <Shopfront
              key={shop.name}
              shop={shop}
              lit={shown === index}
              onPoint={() => setPointed(index)}
            />
          ))}
          <div
            aria-hidden
            className="ul-sidewalk relative w-[30vw] shrink-0 lg:w-[38vw]"
          />
        </div>
      </div>
    </section>
  );
}

function Shopfront({
  shop,
  lit,
  onPoint,
}: {
  shop: (typeof SHOPS)[number];
  lit: boolean;
  onPoint: () => void;
}) {
  const awning = shop.awning ? AWNINGS[shop.awning] : undefined;
  return (
    <article
      className="ul-shop snap-center"
      data-lit={lit}
      data-front={shop.front}
      style={{ '--ul-shop-w': `${shop.width}px` } as CSSProperties}
      onPointerEnter={onPoint}
      onFocus={onPoint}
    >
      <div className="ul-shop-sign">
        <h3 className="ul-shop-name">
          {[...shop.name].map((char, index) => (
            <span
              key={index}
              aria-hidden
              className="ul-letter"
              data-lit={lit}
              data-ignite
            >
              {char}
            </span>
          ))}
          <span className="sr-only">{shop.name}</span>
        </h3>
      </div>
      {awning && (
        <div
          aria-hidden
          className="ul-awning"
          style={
            {
              '--ul-awning-a': awning[0],
              '--ul-awning-b': awning[1],
            } as CSSProperties
          }
        />
      )}
      <div className="ul-shop-window">
        <span aria-hidden className="ul-shop-cone" />
        <WindowDisplay name={shop.name} />
        <p>
          {shop.text}
          {shop.link && (
            <>
              {' '}
              <Link
                href={shop.link.href}
                className="ul-link inline-flex items-center gap-0.5 whitespace-nowrap text-[var(--ul-ink)]"
              >
                {shop.link.label}
                <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            </>
          )}
        </p>
      </div>
      <span aria-hidden className="ul-shop-glow" />
    </article>
  );
}
