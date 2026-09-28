import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { Public } from '../../../shared/infrastructure/http/access.decorators.js';
import type { MarcheRequest } from '../../../shared/infrastructure/http/marche-request.js';
import { TenantContext } from '../../../shared/infrastructure/cls/tenant-context.js';
import { CampaignUseCases, type WhatsAppWebhookPayload } from '../application/campaign.use-cases.js';

/** Comparaison à temps constant, quelle que soit la longueur des deux valeurs. */
function sameSecret(received: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

/** En-tête `X-Hub-Signature-256` de Meta : « sha256=<HMAC-SHA256 hexadécimal du corps brut> ». */
export function isValidMetaSignature(rawBody: Buffer, header: string, appSecret: string): boolean {
  const [scheme, signature] = header.split('=', 2);
  if (scheme !== 'sha256' || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}

/**
 * Webhook WhatsApp Business (Meta), à déclarer chez Meta comme URL de rappel :
 * `https://<domaine>/webhooks/whatsapp`.
 * - GET : vérification de l'URL ; Meta envoie le jeton choisi par le marchand et un défi à renvoyer tel quel.
 * - POST : notifications signées avec la clé secrète de l'app Meta : statuts des messages de campagne
 *   (délivré, lu, échec) et réponses « STOP », traités hors boutique (contexte système).
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('webhooks/whatsapp')
export class WhatsAppWebhooksController {
  private readonly logger = new Logger(WhatsAppWebhooksController.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly campaigns: CampaignUseCases,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = this.config.whatsapp.webhookVerifyToken;
    if (!expected) {
      throw new ServiceUnavailableException({ code: 'WEBHOOKS_DISABLED', message: 'Webhook WhatsApp non configuré' });
    }
    if (mode !== 'subscribe' || !token || !challenge || !sameSecret(token, expected)) {
      throw new ForbiddenException({ code: 'INVALID_VERIFY_TOKEN', message: 'Jeton de vérification invalide' });
    }
    return challenge;
  }

  @Post()
  @HttpCode(200)
  async receive(@Req() request: MarcheRequest, @Headers('x-hub-signature-256') signature?: string): Promise<void> {
    const appSecret = this.config.whatsapp.appSecret;
    if (!appSecret) {
      throw new ServiceUnavailableException({ code: 'WEBHOOKS_DISABLED', message: 'Webhook WhatsApp non configuré' });
    }
    if (!request.rawBody || !signature || !isValidMetaSignature(request.rawBody, signature, appSecret)) {
      throw new BadRequestException({ code: 'INVALID_SIGNATURE', message: 'Signature du webhook invalide' });
    }
    const payload = JSON.parse(request.rawBody.toString('utf8')) as WhatsAppWebhookPayload;
    // Journal sans donnée personnelle : seulement la nature des notifications reçues.
    const fields = (payload.entry ?? []).flatMap((entry) => (entry.changes ?? []).map((change) => change.field ?? '?'));
    this.logger.log(`Notification WhatsApp reçue (${payload.object ?? 'inconnu'}) : ${fields.join(', ') || 'vide'}`);
    await this.tenant.runAsSystem(() => this.campaigns.handleWebhook(payload));
  }
}
