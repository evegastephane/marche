import type { PosSaleDto, PosSettings, StoreDto } from '@marche/contracts';
import { formatMoney } from '@/shared/lib/format';
import { paymentLabel } from './format';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Ticket de caisse, pour l'imprimante thermique (rouleau de 58 ou 80 mm) : boutique, numéro, articles
 * et IMEI, remises, total, paiements et monnaie rendue, mention de pied de ticket.
 */
export function Receipt({
  sale,
  store,
  settings,
  trackingUrl,
}: {
  sale: PosSaleDto;
  store: StoreDto;
  settings: PosSettings;
  trackingUrl: string | null;
}) {
  const { order } = sale;
  const money = (amount: number) => formatMoney(amount, order.currency);
  const customer = order.customer;
  const customerLabel = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.phone || customer.email
    : null;
  const payments = order.payments.filter((payment) => payment.kind === 'PAYMENT');

  return (
    <div
      className="mx-auto bg-white px-[3mm] py-[4mm] text-[11px] leading-[1.35] text-black"
      style={{ width: settings.receiptWidth === '58' ? '48mm' : '72mm' }}
    >
      <p className="text-center text-[14px] font-bold">{store.name}</p>
      {store.phone && <p className="text-center">{store.phone}</p>}
      {store.contactEmail && <p className="text-center">{store.contactEmail}</p>}

      <div className="my-[2mm] border-t border-dashed border-black" />
      <p className="flex justify-between font-bold">
        <span>Ticket n° {order.number}</span>
        <span className="tabular">{order.placedAt ? dateTime.format(new Date(order.placedAt)) : ''}</span>
      </p>
      {(sale.sellerName || sale.sessionLabel) && (
        <p>
          {sale.sessionLabel ? `${sale.sessionLabel} · ` : ''}
          {sale.sellerName ? `Vendeur : ${sale.sellerName}` : ''}
        </p>
      )}
      {customerLabel && <p>Client : {customerLabel}</p>}
      <div className="my-[2mm] border-t border-dashed border-black" />

      <ul className="flex flex-col gap-[1.5mm]">
        {order.lines.map((line) => (
          <li key={line.id}>
            <p className="font-semibold">{line.productTitle}</p>
            {line.variantTitle && line.variantTitle !== 'Par défaut' && <p>{line.variantTitle}</p>}
            {line.serialNumbers.map((serial) => (
              <p key={serial} className="tabular">
                IMEI {serial}
              </p>
            ))}
            <p className="tabular flex justify-between">
              <span>
                {line.quantity} × {money(line.unitPriceAmount)}
              </span>
              <span>{money(line.lineTotalAmount)}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="my-[2mm] border-t border-dashed border-black" />
      {order.discountAmount > 0 && (
        <>
          <p className="tabular flex justify-between">
            <span>Sous-total</span>
            <span>{money(order.subtotalAmount)}</span>
          </p>
          {order.discounts.map((discount) => (
            <p key={`${discount.bundleId}-${discount.title}`} className="tabular flex justify-between">
              <span>{discount.title}</span>
              <span>−{money(discount.amount)}</span>
            </p>
          ))}
        </>
      )}
      <p className="tabular flex justify-between text-[14px] font-bold">
        <span>TOTAL</span>
        <span>{money(order.totalAmount)}</span>
      </p>

      <div className="mt-[1.5mm] flex flex-col">
        {payments.map((payment) => (
          <p key={payment.id} className="tabular flex justify-between">
            <span>
              {paymentLabel(payment.method, payment.provider)}
              {payment.reference ? ` (${payment.reference})` : ''}
            </span>
            <span>{money(payment.tenderedAmount ?? payment.amount)}</span>
          </p>
        ))}
        {sale.changeAmount > 0 && (
          <p className="tabular flex justify-between font-bold">
            <span>Monnaie rendue</span>
            <span>{money(sale.changeAmount)}</span>
          </p>
        )}
      </div>

      {(settings.receiptFooter || trackingUrl) && <div className="my-[2mm] border-t border-dashed border-black" />}
      {settings.receiptFooter && <p className="text-center">{settings.receiptFooter}</p>}
      {trackingUrl && <p className="mt-[1mm] text-center break-all">{trackingUrl}</p>}
    </div>
  );
}
