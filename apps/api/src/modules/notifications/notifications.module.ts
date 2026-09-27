import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../shared/infrastructure/config/app-config.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { EmailSender } from './application/email.port.js';
import { NotificationService } from './application/notification.service.js';
import { createEmailSender } from './infrastructure/email-senders.js';
import { NotificationsEventHandlers } from './interface/notifications.event-handlers.js';

@Module({
  imports: [StoresModule, OrdersModule, CatalogModule],
  providers: [
    { provide: EmailSender, inject: [APP_CONFIG], useFactory: (config: AppConfig) => createEmailSender(config) },
    NotificationService,
    NotificationsEventHandlers,
  ],
})
export class NotificationsModule {}
