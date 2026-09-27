import type { Address, Currency } from '@marche/contracts';
import { formatMoney, formatOrderNumber } from './format.js';
import { html } from './html.js';
import { button, layout, linesTable, muted, paragraph, type RenderedEmail } from './layout.js';

export interface EmailOrderLine {
  productTitle: string;
  variantTitle: string;
  quantity: number;
  lineTotalAmount: number;
}

export interface OrderEmailBase {
  storeName: string;
  orderNumber: number | null;
  customerName: string | null;
  currency: Currency;
}

function greeting(name: string | null): string {
  return name ? `Bonjour ${name},` : 'Bonjour,';
}

function variantDetail(variantTitle: string): string | undefined {
  return variantTitle && variantTitle !== 'Par défaut' ? variantTitle : undefined;
}

function addressLines(address: Address | null): string[] {
  if (!address) return [];
  return [
    `${address.firstName} ${address.lastName}`,
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.country,
  ].filter((line): line is string => Boolean(line));
}

// ───────────── Confirmation de commande (acheteur) ─────────────

export interface OrderConfirmationProps extends OrderEmailBase {
  lines: EmailOrderLine[];
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: Address | null;
  orderUrl: string;
}

export function renderOrderConfirmation(props: OrderConfirmationProps): RenderedEmail {
  const number = formatOrderNumber(props.orderNumber);
  const money = (amount: number) => formatMoney(amount, props.currency);
  const subject = `${props.storeName} : commande ${number} confirmée`;
  const address = addressLines(props.shippingAddress);
  const body = html`
    ${paragraph(greeting(props.customerName))}
    ${paragraph(`Merci pour votre commande ${number}. Nous la préparons et vous préviendrons dès son expédition.`)}
    ${linesTable(
      props.lines.map((line) => ({
        label: line.productTitle,
        detail: variantDetail(line.variantTitle),
        quantity: line.quantity,
        amount: money(line.lineTotalAmount),
      })),
      [
        { label: 'Sous-total', amount: money(props.subtotalAmount) },
        { label: 'Livraison', amount: props.shippingAmount === 0 ? 'Offerte' : money(props.shippingAmount) },
        { label: 'Total', amount: money(props.totalAmount), strong: true },
      ],
    )}
    ${address.length ? html`${muted('Livraison à :')}${paragraph(html`${address.map((line, i) => html`${i ? html`<br />` : ''}${line}`)}`)}` : ''}
    ${paragraph('Le paiement se fait à la livraison, sauf indication contraire de la boutique.')}
    <p style="margin:24px 0">${button('Suivre ma commande', props.orderUrl)}</p>
  `;
  const text = [
    greeting(props.customerName),
    '',
    `Merci pour votre commande ${number}.`,
    '',
    ...props.lines.map(
      (line) =>
        `- ${line.productTitle}${variantDetail(line.variantTitle) ? ` (${line.variantTitle})` : ''} × ${line.quantity} : ${money(line.lineTotalAmount)}`,
    ),
    '',
    `Sous-total : ${money(props.subtotalAmount)}`,
    `Livraison : ${props.shippingAmount === 0 ? 'offerte' : money(props.shippingAmount)}`,
    `Total : ${money(props.totalAmount)}`,
    ...(address.length ? ['', 'Livraison à :', ...address] : []),
    '',
    `Suivre ma commande : ${props.orderUrl}`,
  ].join('\n');
  return {
    subject,
    html: layout({ storeName: props.storeName, preheader: `Commande ${number} confirmée`, title: 'Commande confirmée', body }),
    text,
  };
}

// ───────────── Nouvelle commande (marchand) ─────────────

export interface MerchantNewOrderProps extends OrderEmailBase {
  email: string | null;
  itemsCount: number;
  totalAmount: number;
  orderAdminUrl: string;
}

export function renderMerchantNewOrder(props: MerchantNewOrderProps): RenderedEmail {
  const number = formatOrderNumber(props.orderNumber);
  const total = formatMoney(props.totalAmount, props.currency);
  const who = props.customerName ?? props.email ?? 'Un client';
  const subject = `Nouvelle commande ${number} : ${total}`;
  const body = html`
    ${paragraph(`${who} vient de passer la commande ${number} : ${props.itemsCount} article${props.itemsCount > 1 ? 's' : ''} pour ${total}.`)}
    ${paragraph('Le stock correspondant est réservé. Pensez à préparer et expédier la commande.')}
    <p style="margin:24px 0">${button('Voir la commande', props.orderAdminUrl)}</p>
  `;
  const text = [
    `${who} vient de passer la commande ${number} : ${props.itemsCount} article(s) pour ${total}.`,
    '',
    `Voir la commande : ${props.orderAdminUrl}`,
  ].join('\n');
  return {
    subject,
    html: layout({ storeName: props.storeName, preheader: subject, title: `Nouvelle commande ${number}`, body }),
    text,
  };
}

// ───────────── Commande expédiée (acheteur) ─────────────

export interface OrderShippedProps extends OrderEmailBase {
  orderUrl: string;
}

export function renderOrderShipped(props: OrderShippedProps): RenderedEmail {
  const number = formatOrderNumber(props.orderNumber);
  const subject = `${props.storeName} : votre commande ${number} est en route`;
  const body = html`
    ${paragraph(greeting(props.customerName))}
    ${paragraph(`Bonne nouvelle : votre commande ${number} a été expédiée.`)}
    <p style="margin:24px 0">${button('Voir ma commande', props.orderUrl)}</p>
  `;
  const text = [greeting(props.customerName), '', `Votre commande ${number} a été expédiée.`, '', props.orderUrl].join('\n');
  return {
    subject,
    html: layout({ storeName: props.storeName, preheader: subject, title: 'Commande expédiée', body }),
    text,
  };
}

// ───────────── Stock bas (marchand) ─────────────

export interface LowStockAlertProps {
  storeName: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  available: number;
  threshold: number;
  inventoryUrl: string;
}

export function renderLowStockAlert(props: LowStockAlertProps): RenderedEmail {
  const label = variantDetail(props.variantTitle) ? `${props.productTitle} (${props.variantTitle})` : props.productTitle;
  const status = props.available <= 0 ? 'est en rupture' : `n’a plus que ${props.available} unité${props.available > 1 ? 's' : ''}`;
  const subject = `Stock bas : ${label}`;
  const body = html`
    ${paragraph(`${label} ${status} (seuil d’alerte : ${props.threshold}).`)}
    ${muted(`SKU : ${props.sku}`)}
    <p style="margin:24px 0">${button('Réapprovisionner', props.inventoryUrl)}</p>
  `;
  const text = [`${label} ${status} (seuil : ${props.threshold}).`, `SKU : ${props.sku}`, '', props.inventoryUrl].join('\n');
  return {
    subject,
    html: layout({ storeName: props.storeName, preheader: subject, title: 'Stock bas', body }),
    text,
  };
}
