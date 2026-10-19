import { PUBLISHABLE_KEY_HEADER } from '@marche/contracts';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock } from '@/components/developers/code-block';
import { PUBLIC_API_URL } from '@/lib/developers';

export const metadata: Metadata = {
  title: { absolute: 'Développeurs · Upsell' },
};

const API = PUBLIC_API_URL;

const DOORS = [
  {
    prefix: 'pk_',
    name: 'Clé publique',
    where: 'Dans le navigateur ou une app mobile',
    route: '/storefront/v1',
    header: `${PUBLISHABLE_KEY_HEADER}: pk_…`,
    does: [
      'Lire le catalogue, les filtres, les disponibilités',
      'Remplir un panier et passer commande',
      'Déposer une demande (devis, reprise)',
    ],
    guard: 'Refusée depuis toute adresse que vous n’avez pas déclarée.',
  },
  {
    prefix: 'sk_',
    name: 'Clé secrète',
    where: 'Sur un serveur, jamais dans une page',
    route: '/api/v1',
    header: 'Authorization: Bearer sk_…',
    does: [
      'Gérer produits, catégories, attributs, photos',
      'Suivre le stock, les IMEI et les mouvements',
      'Traiter les commandes et les clients',
    ],
    guard: 'Chaque domaine en lecture ou en écriture ; le reste lui est fermé.',
  },
] as const;

const RULES: { term: string; text: string }[] = [
  {
    term: 'Erreurs',
    text: 'problem+json (RFC 9457) : un status HTTP et un code stable (SKU_TAKEN, INSUFFICIENT_SCOPE…) à tester plutôt que le message.',
  },
  {
    term: 'Pagination',
    text: 'Par curseur : envoyez limit, puis le nextCursor reçu comme cursor. null signale la dernière page.',
  },
  {
    term: 'Idempotence',
    text: 'Le checkout exige un en-tête Idempotency-Key (un UUID par tentative) : un double clic ne crée jamais deux commandes.',
  },
  {
    term: 'Montants',
    text: 'Entiers dans la plus petite unité de la devise : 25000 vaut 25 000 FCFA, qui n’a pas de décimales.',
  },
  {
    term: 'Stock',
    text: 'Réservé au moment de la commande : ce que l’API annonce disponible l’est vraiment, même quand plusieurs clients commandent ensemble.',
  },
  {
    term: 'Versions',
    text: 'Tout est sous /v1. Un changement qui casse un contrat passera par /v2, jamais en place.',
  },
];

const READ = `// 1. Lire le catalogue, depuis le navigateur
const res = await fetch('${API}/storefront/v1/products?limit=24', {
  headers: { '${PUBLISHABLE_KEY_HEADER}': process.env.NEXT_PUBLIC_UPSELL_KEY },
});
const { items, nextCursor } = await res.json();
// items[0] → { title, slug, priceMinAmount, image, swatches… }`;

const ORDER = `// 2. Panier puis commande
const headers = {
  '${PUBLISHABLE_KEY_HEADER}': process.env.NEXT_PUBLIC_UPSELL_KEY,
  'content-type': 'application/json',
};
const cart = await fetch('${API}/storefront/v1/carts', { method: 'POST', headers })
  .then((r) => r.json());

await fetch(\`${API}/storefront/v1/carts/\${cart.id}/lines\`, {
  method: 'POST', headers,
  body: JSON.stringify({ variantId, quantity: 1 }),
});

const order = await fetch('${API}/storefront/v1/checkout', {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
  body: JSON.stringify({
    cartId: cart.id,
    email: 'awa@exemple.com',
    phone: '+237 6 90 00 00 00',
    shippingAddress: { firstName: 'Awa', lastName: 'Ngo', line1: 'Bonapriso', city: 'Douala', country: 'CM' },
  }),
}).then((r) => r.json());`;

const SERVER = `// 3. Côté serveur : clé secrète, gardée dans l'environnement
const res = await fetch('${API}/api/v1/inventory?filter=low', {
  headers: { Authorization: \`Bearer \${process.env.UPSELL_SECRET_KEY}\` },
});
if (!res.ok) {
  const problem = await res.json(); // { status, code, detail }
  throw new Error(problem.code);    // ex. INSUFFICIENT_SCOPE
}`;

const TYPED = `npx openapi-typescript ${API}/openapi.json -o upsell-api.d.ts`;

export default function DevelopersHome() {
  return (
    <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-20 px-4 pt-12 pb-24 sm:px-6 lg:gap-28 lg:px-10 lg:pt-20">
      {/* Accroche : ce que le portail permet, et l'afficheur qui le montre. */}
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] lg:gap-14">
        <div className="flex flex-col items-start gap-6">
          <h1 className="up-display-title up-rise max-w-[15ch] text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem]">
            Branchez votre front sur une boutique Upsell.
          </h1>
          <p className="up-rise max-w-[52ch] text-[1.0625rem] leading-[1.6] text-[var(--up-ink-2)] [--up-delay:60ms]">
            Catalogue, stock et commandes par API, pour un site Next.js, une app
            mobile ou votre ERP. Deux clés suffisent : une publique pour le
            navigateur, une secrète pour vos serveurs.
          </p>
          <div className="up-rise flex flex-wrap items-center gap-2 [--up-delay:120ms]">
            <Link
              href="/developers/keys"
              className="up-key group"
              data-variant="primary"
              data-size="lg"
            >
              Obtenir une clé
              <ArrowRight
                aria-hidden
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/developers/reference"
              className="up-key"
              data-variant="ghost"
              data-size="lg"
            >
              Parcourir la référence
            </Link>
          </div>
        </div>

        <figure
          className="up-lcd up-rise flex flex-col overflow-hidden rounded-[1.25rem] [--up-delay:180ms]"
          aria-label="Exemple d’appel à l’API"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--up-display-line)] px-5 py-3.5">
            <span className="flex items-center gap-2.5">
              <span className="up-led" data-on="true" aria-hidden />
              <span className="up-legend">Exemple · requête</span>
            </span>
            <span className="up-legend">200</span>
          </div>
          <pre className="up-code overflow-x-auto px-5 py-4 text-[0.8125rem] leading-[1.75]">
            <code>
              <span className="text-[var(--up-display-dim)]">GET</span>{' '}
              /storefront/v1/products?limit=2{'\n'}
              <span className="text-[var(--up-display-dim)]">
                {PUBLISHABLE_KEY_HEADER}:
              </span>{' '}
              pk_4f…9aQ
            </code>
          </pre>
          <div className="border-t border-[var(--up-display-line)] px-5 pt-3 pb-1">
            <span className="up-legend">Exemple · réponse</span>
          </div>
          <pre className="up-code overflow-x-auto px-5 pt-2 pb-5 text-[0.8125rem] leading-[1.75]">
            <code>{`{
  "items": [
    { "title": "iPhone 17 Pro", "priceMinAmount": 899000,
      "swatches": [{ "value": "Bleu", "hex": "#1F5FAE" }] },
    { "title": "AirPods Pro 3", "priceMinAmount": 189000 }
  ],
  "nextCursor": "WyIyMDI2LTA5LTI5Ii…"
}`}</code>
          </pre>
        </figure>
      </section>

      {/* Deux clés, deux portes : une seule face partagée par un filet. */}
      <section aria-labelledby="deux-cles" className="flex flex-col gap-6">
        <div className="flex max-w-[60ch] flex-col gap-2">
          <h2
            id="deux-cles"
            className="up-heading text-[1.5rem] sm:text-[1.875rem]"
          >
            Deux clés, deux portes
          </h2>
          <p className="text-[var(--up-ink-2)]">
            Le préfixe dit tout : une clé pk_ peut vivre dans le code d’une
            page, une clé sk_ jamais.
          </p>
        </div>
        <div className="up-panel grid md:grid-cols-2">
          {DOORS.map((door, index) => (
            <article
              key={door.prefix}
              className={`flex flex-col gap-5 p-6 sm:p-7 ${index === 0 ? 'max-md:border-b md:border-r border-[var(--up-line)]' : ''}`}
            >
              <header className="flex flex-col gap-1.5">
                <span className="up-code text-[1.75rem] leading-none font-[500] tracking-[-0.02em]">
                  {door.prefix}
                </span>
                <span className="up-heading text-[1.0625rem]">
                  {door.name}{' '}
                  <span className="font-[450] text-[var(--up-ink-2)]">
                    · {door.where}
                  </span>
                </span>
              </header>
              <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 text-[0.875rem]">
                <dt className="up-legend pt-0.5">Ouvre</dt>
                <dd className="up-code">{door.route}</dd>
                <dt className="up-legend pt-0.5">En-tête</dt>
                <dd className="up-code break-all">{door.header}</dd>
              </dl>
              <ul className="flex flex-col gap-2 text-[0.9375rem]">
                {door.does.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="up-led mt-[0.45rem]"
                      data-on="true"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-auto border-t border-[var(--up-line)] pt-4 text-[0.875rem] text-[var(--up-ink-2)]">
                {door.guard}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Démarrage : la séquence compte, d'où les numéros. */}
      <section
        aria-labelledby="demarrage"
        className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14"
      >
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <h2
            id="demarrage"
            className="up-heading text-[1.5rem] sm:text-[1.875rem]"
          >
            Démarrer en dix minutes
          </h2>
          <p className="text-[var(--up-ink-2)]">
            Créez une clé publique dans{' '}
            <Link href="/developers/keys" className="up-link">
              Mes clés
            </Link>
            , déclarez l’adresse de votre site, puis appelez la vitrine.
          </p>
          <p className="text-[0.875rem] text-[var(--up-ink-2)]">
            Un client typé se génère depuis la référence :
          </p>
          <CodeBlock label="Client TypeScript" code={TYPED} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CodeBlock label="1 · Catalogue" code={READ} />
          <CodeBlock label="2 · Panier et commande" code={ORDER} />
          <CodeBlock label="3 · Serveur" code={SERVER} />
        </div>
      </section>

      {/* Les règles du contrat. */}
      <section aria-labelledby="regles" className="flex flex-col gap-6">
        <h2 id="regles" className="up-heading text-[1.5rem] sm:text-[1.875rem]">
          Ce que l’API garantit
        </h2>
        <dl className="up-panel grid gap-px overflow-hidden bg-[var(--up-line)] sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <div
              key={rule.term}
              className="flex flex-col gap-1.5 bg-[var(--up-surface)] p-6"
            >
              <dt className="text-[1rem] font-[650]">{rule.term}</dt>
              <dd className="text-[0.9375rem] leading-[1.55] text-[var(--up-ink-2)]">
                {rule.text}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[var(--up-ink-2)]">
          Chaque route, ses paramètres et son corps sont dans la{' '}
          <Link href="/developers/reference" className="up-link">
            référence
          </Link>
          , générée depuis l’API elle-même ; le document brut est à{' '}
          <a
            href={`${API}/openapi.json`}
            className="up-link up-code text-[0.9375rem]"
          >
            /openapi.json
          </a>
          .
        </p>
      </section>
    </main>
  );
}
