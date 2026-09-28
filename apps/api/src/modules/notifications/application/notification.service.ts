import { Injectable, Logger } from '@nestjs/common';
import {
  renderLowStockAlert,
  renderMerchantNewOrder,
  renderMerchantSpecialRequest,
  renderOrderConfirmation,
  renderOrderShipped,
  renderSpecialRequestQuoted,
} from '@marche/emails';
import { PublicUrls } from '../../../shared/application/public-urls.port.js';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { OrdersFacade } from '../../orders/orders.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { EmailSender } from './email.port.js';

interface StockLowPayload {
  variantId: string;
  available: number;
  threshold: number;
}

/**
 * E-mails transactionnels (UC-51, UC-22). Chaque envoi porte une clé d'idempotence
 * dérivée de l'événement : un job rejoué ne renvoie pas le même e-mail (Resend).
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly email: EmailSender,
    private readonly stores: StoresFacade,
    private readonly orders: OrdersFacade,
    private readonly catalog: CatalogFacade,
    private readonly urls: PublicUrls,
  ) {}

  /** Confirmation à l'acheteur. */
  async sendOrderConfirmation(event: SerializedDomainEvent): Promise<void> {
    const order = await this.orders.getSummary(event.aggregateId);
    if (!order?.email) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderOrderConfirmation({
      storeName: store.name,
      orderNumber: order.number,
      customerName: order.customerName,
      currency: order.currency,
      lines: order.lines,
      subtotalAmount: order.subtotalAmount,
      discounts: order.discounts,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      orderUrl: `${this.urls.site(store.slug)}/orders/${order.publicToken}`,
    });
    await this.email.send({
      to: [order.email],
      ...rendered,
      ...(store.contactEmail ? { replyTo: store.contactEmail } : {}),
      idempotencyKey: `${event.id}-order-confirmation`,
    });
  }

  /** Alerte « nouvelle commande » au marchand. */
  async sendMerchantNewOrder(event: SerializedDomainEvent): Promise<void> {
    const recipients = await this.stores.notificationRecipients(event.storeId);
    if (recipients.length === 0) {
      this.logger.warn(`Aucun destinataire marchand pour la boutique ${event.storeId}`);
      return;
    }
    const order = await this.orders.getSummary(event.aggregateId);
    if (!order) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderMerchantNewOrder({
      storeName: store.name,
      orderNumber: order.number,
      customerName: order.customerName,
      email: order.email,
      currency: order.currency,
      itemsCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      totalAmount: order.totalAmount,
      orderAdminUrl: this.urls.dashboard(`/orders/${order.id}`),
    });
    await this.email.send({ to: recipients, ...rendered, idempotencyKey: `${event.id}-merchant-new-order` });
  }

  /** Avis d'expédition à l'acheteur. */
  async sendOrderShipped(event: SerializedDomainEvent): Promise<void> {
    const order = await this.orders.getSummary(event.aggregateId);
    if (!order?.email) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderOrderShipped({
      storeName: store.name,
      orderNumber: order.number,
      customerName: order.customerName,
      currency: order.currency,
      orderUrl: `${this.urls.site(store.slug)}/orders/${order.publicToken}`,
    });
    await this.email.send({
      to: [order.email],
      ...rendered,
      ...(store.contactEmail ? { replyTo: store.contactEmail } : {}),
      idempotencyKey: `${event.id}-order-shipped`,
    });
  }

  /** Commande sur demande reçue : le marchand la chiffre ou la refuse. */
  async sendMerchantSpecialRequest(event: SerializedDomainEvent): Promise<void> {
    const recipients = await this.stores.notificationRecipients(event.storeId);
    if (recipients.length === 0) return;
    const request = await this.orders.getSpecialRequest(event.aggregateId);
    if (!request) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderMerchantSpecialRequest({
      storeName: store.name,
      productTitle: request.productTitle,
      configuration: request.options.map((option) => option.value).join(' / '),
      quantity: request.quantity,
      customerName: [request.firstName, request.lastName].filter(Boolean).join(' '),
      phone: request.phone,
      email: request.email,
      note: request.note,
      requestAdminUrl: this.urls.dashboard(`/requests/${request.id}`),
    });
    await this.email.send({ to: recipients, ...rendered, idempotencyKey: `${event.id}-merchant-special-request` });
  }

  /** Devis envoyé : prix et délai annoncés à l'acheteur, qui répond pour confirmer. */
  async sendSpecialRequestQuoted(event: SerializedDomainEvent): Promise<void> {
    const request = await this.orders.getSpecialRequest(event.aggregateId);
    if (!request || request.quotedUnitPriceAmount === null || !request.quotedDelay) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderSpecialRequestQuoted({
      storeName: store.name,
      productTitle: request.productTitle,
      configuration: request.options.map((option) => option.value).join(' / '),
      quantity: request.quantity,
      customerName: request.firstName,
      currency: request.currency,
      unitPriceAmount: request.quotedUnitPriceAmount,
      delay: request.quotedDelay,
      contactEmail: store.contactEmail,
      phone: store.phone,
    });
    await this.email.send({
      to: [request.email],
      ...rendered,
      ...(store.contactEmail ? { replyTo: store.contactEmail } : {}),
      idempotencyKey: `${event.id}-special-request-quoted`,
    });
  }

  /** Alerte de stock bas au marchand. */
  async sendLowStockAlert(event: SerializedDomainEvent<StockLowPayload>): Promise<void> {
    const recipients = await this.stores.notificationRecipients(event.storeId);
    if (recipients.length === 0) return;
    const variant = (await this.catalog.snapshotVariants([event.payload.variantId])).get(event.payload.variantId);
    if (!variant || variant.variantArchived) return;
    const store = await this.stores.getSettings(event.storeId);
    const rendered = renderLowStockAlert({
      storeName: store.name,
      productTitle: variant.productTitle,
      variantTitle: variant.variantTitle,
      sku: variant.sku,
      available: event.payload.available,
      threshold: event.payload.threshold,
      inventoryUrl: this.urls.dashboard('/inventory?filter=low'),
    });
    await this.email.send({ to: recipients, ...rendered, idempotencyKey: `${event.id}-low-stock` });
  }
}
