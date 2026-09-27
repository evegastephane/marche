import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { CART_COOKIE } from '@/lib/site';
import { getCart, getStore } from '@/lib/storefront-api';
import { CartLineControls } from '@/templates/default/components/cart-line-controls';

export const metadata: Metadata = { title: 'Panier' };

export default async function CartPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  const cart = cartId ? await getCart(site, cartId) : null;
  const lines = cart?.lines ?? [];
  const blocked = lines.some((l) => !l.isSellable || (l.available != null && l.available < l.quantity));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pt-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Panier</h1>
      {!cart || lines.length === 0 ? (
        <div className="flex flex-col items-start gap-5">
          <p className="text-lg text-muted">Votre panier est vide.</p>
          <Link
            href="/collections"
            className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary no-underline transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            Voir les produits
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {lines.map((line) => (
              <li
                key={line.variantId}
                className="grid grid-cols-[4.5rem_1fr] gap-4 py-5 sm:grid-cols-[5.5rem_1fr_auto]"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-soft">
                  {line.imageUrl && <img src={line.imageUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  {line.productSlug ? (
                    <Link href={`/products/${line.productSlug}`} className="font-semibold text-fg">
                      {line.productTitle}
                    </Link>
                  ) : (
                    <span className="font-semibold">{line.productTitle}</span>
                  )}
                  {line.variantTitle !== 'Par défaut' && (
                    <span className="text-sm text-muted">{line.variantTitle}</span>
                  )}
                  <span className="tabular text-sm text-muted">
                    {formatMoney(line.unitPriceAmount, cart.currency)} l’unité
                  </span>
                  {!line.isSellable ? (
                    <span className="text-sm font-semibold text-red-700">
                      Plus disponible : retirez-le pour commander.
                    </span>
                  ) : (
                    line.available != null &&
                    line.available < line.quantity && (
                      <span className="text-sm font-semibold text-red-700">Il n’en reste que {line.available}.</span>
                    )
                  )}
                  <div className="mt-2 sm:hidden">
                    <CartLineControls
                      variantId={line.variantId}
                      quantity={line.quantity}
                      max={line.available}
                      title={line.productTitle}
                    />
                  </div>
                </div>
                <div className="hidden flex-col items-end gap-3 sm:flex">
                  <span className="tabular font-semibold">{formatMoney(line.lineTotalAmount, cart.currency)}</span>
                  <CartLineControls
                    variantId={line.variantId}
                    quantity={line.quantity}
                    max={line.available}
                    title={line.productTitle}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-stretch gap-4 self-end sm:w-80">
            <dl className="tabular flex flex-col gap-2">
              <div className="flex justify-between text-muted">
                <dt>Sous-total</dt>
                <dd>{formatMoney(cart.subtotalAmount, cart.currency)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Livraison</dt>
                <dd>{cart.shippingAmount === 0 ? 'Offerte' : formatMoney(cart.shippingAmount, cart.currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
                <dt>Total</dt>
                <dd>{formatMoney(cart.totalAmount, cart.currency)}</dd>
              </div>
            </dl>
            {blocked ? (
              <p className="rounded-lg bg-soft px-4 py-3 text-sm font-semibold">
                Ajustez les articles signalés pour commander.
              </p>
            ) : (
              <Link
                href="/checkout"
                className="rounded-full bg-primary px-6 py-3.5 text-center font-semibold text-on-primary no-underline transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Passer commande
              </Link>
            )}
            <p className="text-center text-sm text-muted">{store.name} · paiement à la réception</p>
          </div>
        </>
      )}
    </div>
  );
}
