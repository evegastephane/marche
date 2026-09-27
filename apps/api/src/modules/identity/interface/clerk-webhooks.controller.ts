import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Webhook } from 'svix';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { Public } from '../../../shared/infrastructure/http/access.decorators.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
import { ClerkWebhookHandler, type ClerkWebhookEvent } from '../application/clerk-webhook.handler.js';

/** Webhooks Clerk signés (svix) : utilisateurs, organisations, adhésions. */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('webhooks')
export class ClerkWebhooksController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly handler: ClerkWebhookHandler,
  ) {}

  @Post('clerk')
  @HttpCode(204)
  async clerk(
    @Req() request: MarcheRequest,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ): Promise<void> {
    const secret = this.config.clerk.webhookSigningSecret;
    if (!secret) {
      throw new ServiceUnavailableException({ code: 'WEBHOOKS_DISABLED', message: 'Webhooks Clerk non configurés' });
    }
    if (!request.rawBody || !svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException({ code: 'INVALID_SIGNATURE', message: 'Signature du webhook absente' });
    }
    const payload = request.rawBody.toString('utf8');
    try {
      // Lève une erreur si la signature ou l'horodatage ne correspondent pas.
      new Webhook(secret).verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch {
      throw new BadRequestException({ code: 'INVALID_SIGNATURE', message: 'Signature du webhook invalide' });
    }
    await this.handler.handle(JSON.parse(payload) as ClerkWebhookEvent);
  }
}
