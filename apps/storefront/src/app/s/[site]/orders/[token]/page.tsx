import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { getPublicOrder, getStore } from '@/lib/storefront-api';
import { Reveal, SuccessCheck } from '@/templates/default/components/motion';

export const metadata: Metadata = {
  title: 'Votre commande',
  robots: { index: false },
};

const STATUS: Record<string, string> = {
  PLACED: 'Commande reçue : la boutique la prépare.',
  FULFILLED: 'Commande expédiée.',
  CANCELLED: 'Commande annulée.',
  DRAFT: 'Commande en préparation.',
};

export default async function OrderConfirmation({ params }: { params: Promise<{ site: string; token: string }> }) {
  const { site, token } = await params;
  const [store, order] = await Promise.all([getStore(site), getPublicOrder(site, token)]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-14 sm:px-6">
      <div className="flex flex-col gap-3">
        <SuccessCheck className="mb-2 size-14" />
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">Commande n° {order.number}</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Merci pour votre commande</h1>
        <p className="text-lg text-fg/80">
          {STATUS[order.status]} Un e-mail de confirmation vous a été envoyé.{' '}
          {order.paymentStatus === 'PAID' ? 'Paiement reçu.' : 'Vous réglez à la réception.'}
        </p>
      </div>
      <Reveal>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {order.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-4 py-4">
              <span>
                <span className="font-semibold">{line.quantity} × </span>
                {line.productTitle}
                {line.variantTitle !== 'Par défaut' && <span className="text-muted"> · {line.variantTitle}</span>}
              </span>
              <span className="tabular shrink-0">{formatMoney(line.lineTotalAmount, order.currency)}</span>
            </li>
          ))}
        </ul>
      </Reveal>
      <dl className="tabular flex flex-col gap-2">
        <div className="flex justify-between text-muted">
          <dt>Livraison{order.shippingCity ? ` à ${order.shippingCity}` : ''}</dt>
          <dd>{order.shippingAmount === 0 ? 'Offerte' : formatMoney(order.shippingAmount, order.currency)}</dd>
        </div>
        <div className="flex justify-between text-xl font-bold">
          <dt>Total</dt>
          <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
        </div>
      </dl>
      <Link
        href="/"
        className="self-start rounded-full bg-primary px-6 py-3 font-semibold text-on-primary no-underline transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
      >
        Continuer sur {store.name}
      </Link>
    </div>
  );
}
