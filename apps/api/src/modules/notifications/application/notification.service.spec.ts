import { describe, expect, it } from 'vitest';
import type { PublicUrls } from '../../../shared/application/public-urls.port.js';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import type { CatalogFacade } from '../../catalog/catalog.facade.js';
import type { OrderSummary } from '../../orders/application/orders.ports.js';
import type { OrdersFacade } from '../../orders/orders.facade.js';
import type { StoresFacade } from '../../stores/stores.facade.js';
import type { EmailSender, OutgoingEmail } from './email.port.js';
import { NotificationService } from './notification.service.js';

function summary(source: OrderSummary['source']): OrderSummary {
  return {
    id: 'commande-1',
    number: 1042,
    status: 'FULFILLED',
    source,
    email: 'fatou@example.com',
    customerName: 'Fatou',
    currency: 'XOF',
    lines: [{ productTitle: 'Câble USB-C', variantTitle: 'Par défaut', quantity: 1, unitPriceAmount: 5000, lineTotalAmount: 5000, serialNumbers: [] }],
    subtotalAmount: 5000,
    discounts: [],
    discountAmount: 0,
    shippingAmount: 0,
    totalAmount: 5000,
    shippingAddress: null,
    publicToken: 'jeton',
    placedAt: new Date().toISOString(),
  };
}

function service(source: OrderSummary['source']) {
  const sent: OutgoingEmail[] = [];
  const email = { send: async (message: OutgoingEmail) => void sent.push(message) } as unknown as EmailSender;
  const stores = {
    getSettings: async () => ({ name: 'Iphone Deals', slug: 'iphone-deals', contactEmail: null }),
    notificationRecipients: async () => ['patron@example.com'],
  } as unknown as StoresFacade;
  const orders = { getSummary: async () => summary(source) } as unknown as OrdersFacade;
  const urls = { site: (slug: string) => `https://${slug}.upsell.test`, dashboard: (path: string) => `https://app.upsell.test${path}` } as unknown as PublicUrls;
  return { notifications: new NotificationService(email, stores, orders, {} as CatalogFacade, urls), sent };
}

const event = { id: 'evt-1', storeId: 'boutique-1', aggregateId: 'commande-1' } as SerializedDomainEvent;

describe('Notifications : vente au comptoir', () => {
  it('envoie le ticket au client qui a donné son e-mail, sans alerter le marchand ni annoncer d’expédition', async () => {
    const { notifications, sent } = service('POS');
    await notifications.sendOrderConfirmation(event);
    await notifications.sendMerchantNewOrder(event);
    await notifications.sendOrderShipped(event);
    expect(sent.map((message) => message.to)).toEqual([['fatou@example.com']]);
  });

  it('garde l’alerte et l’avis d’expédition pour une commande du site', async () => {
    const { notifications, sent } = service('STOREFRONT');
    await notifications.sendMerchantNewOrder(event);
    await notifications.sendOrderShipped(event);
    expect(sent.map((message) => message.to)).toEqual([['patron@example.com'], ['fatou@example.com']]);
  });
});
