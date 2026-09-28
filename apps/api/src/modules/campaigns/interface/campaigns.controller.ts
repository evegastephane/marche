import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CampaignDto,
  type LaunchCampaignInput,
  launchCampaignSchema,
  type WhatsAppAudienceDto,
} from '@marche/contracts';
import { ADMIN_API, Roles } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody } from '../../../shared/infrastructure/http/zod-validation.js';
import { CampaignUseCases } from '../application/campaign.use-cases.js';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/campaigns`)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignUseCases) {}

  @Get()
  list(): Promise<CampaignDto[]> {
    return this.campaigns.list();
  }

  /** Clients joignables maintenant, et si l'envoi WhatsApp est configuré. */
  @Get('audience')
  audience(): Promise<WhatsAppAudienceDto> {
    return this.campaigns.audience();
  }

  /** Lance une campagne WhatsApp pour un produit en vente ; l'envoi part dans le worker. */
  @Post()
  @Roles('ADMIN')
  @ApiZodBody(launchCampaignSchema)
  launch(@ZodBody(launchCampaignSchema) input: LaunchCampaignInput): Promise<CampaignDto> {
    return this.campaigns.launch(input);
  }
}
