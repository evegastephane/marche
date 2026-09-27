import type { Currency } from '@marche/contracts';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { CART_COOKIE } from '@/lib/site';
import { getCart } from '@/lib/storefront-api';
import { CheckoutForm } from '@/templates/default/components/checkout-form';

export const metadata: Metadata = { title: 'Commande' };

const COUNTRY_BY_CURRENCY: Partial<Record<Currency, string>> = { XOF: 'SN', XAF: 'CM', EUR: 'FR', MAD: 'MA' };

export default async function CheckoutPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  const cart = cartId ? await getCart(site, cartId) : null;
  if (!cart || cart.lines.length === 0) redirect('/cart');

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-8">
        <h1 className="text-4xl font-bold sm:text-5xl">Commande</h1>
        <CheckoutForm defaultCountry={COUNTRY_BY_CURRENCY[cart.currency] ?? 'SN'} />
      </div>
      <aside className="flex flex-col gap-5 self-start rounded-2xl bg-soft p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">Récapitulatif</h2>
        <ul className="flex flex-col gap-3 text-sm">
          {cart.lines.map((line) => (
            <li key={line.variantId} className="flex justify-between gap-4">
              <span className="min-w-0">
                <span className="font-semibold">{line.quantity} × </span>
                {line.productTitle}
                {line.variantTitle !== 'Par défaut' && <span className="text-muted"> · {line.variantTitle}</span>}
              </span>
              <span className="tabular shrink-0">{formatMoney(line.lineTotalAmount, cart.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="tabular flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Livraison</dt>
            <dd>{cart.shippingAmount === 0 ? 'Offerte' : formatMoney(cart.shippingAmount, cart.currency)}</dd>
          </div>
          <div className="flex justify-between text-lg font-bold text-fg">
            <dt>Total</dt>
            <dd>{formatMoney(cart.totalAmount, cart.currency)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
