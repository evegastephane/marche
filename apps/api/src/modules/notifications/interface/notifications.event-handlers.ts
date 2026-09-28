import { Injectable } from '@nestjs/common';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { OnDomainEvent } from '../../../shared/infrastructure/queue/on-domain-event.decorator.js';
import { NotificationService } from '../application/notification.service.js';

/** Abonnés du module notifications (worker, file « notifications »). */
@Injectable()
export class NotificationsEventHandlers {
  constructor(private readonly notifications: NotificationService) {}

  @OnDomainEvent({ event: 'orders.order.placed', queue: 'notifications', name: 'order-confirmation' })
  onOrderPlacedForCustomer(event: SerializedDomainEvent): Promise<void> {
    return this.notifications.sendOrderConfirmation(event);
  }

  @OnDomainEvent({ event: 'orders.order.placed', queue: 'notifications', name: 'merchant-new-order' })
  onOrderPlacedForMerchant(event: SerializedDomainEvent): Promise<void> {
    return this.notifications.sendMerchantNewOrder(event);
  }

  @OnDomainEvent({ event: 'orders.order.fulfilled', queue: 'notifications', name: 'order-shipped' })
  onOrderFulfilled(event: SerializedDomainEvent): Promise<void> {
    return this.notifications.sendOrderShipped(event);
  }

  @OnDomainEvent({ event: 'orders.special-request.received', queue: 'notifications', name: 'merchant-special-request' })
  onSpecialRequestReceived(event: SerializedDomainEvent): Promise<void> {
    return this.notifications.sendMerchantSpecialRequest(event);
  }

  @OnDomainEvent({ event: 'orders.special-request.quoted', queue: 'notifications', name: 'special-request-quoted' })
  onSpecialRequestQuoted(event: SerializedDomainEvent): Promise<void> {
    return this.notifications.sendSpecialRequestQuoted(event);
  }

  @OnDomainEvent({ event: 'inventory.stock.low', queue: 'notifications', name: 'low-stock-alert' })
  onStockLow(event: SerializedDomainEvent<{ variantId: string; available: number; threshold: number }>): Promise<void> {
    return this.notifications.sendLowStockAlert(event);
  }
}
