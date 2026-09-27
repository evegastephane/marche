import { Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type GenerateSiteInput,
  generateSiteSchema,
  type PreviewTokenDto,
  type SiteDto,
  type UpdateDraftThemeInput,
  updateDraftThemeSchema,
} from '@marche/contracts';
import { ADMIN_API, Roles } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody } from '../../../shared/infrastructure/http/zod-validation.js';
import { GenerateSiteUseCase, SiteUseCases } from '../application/site.use-cases.js';

@ApiTags('site')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/site`)
export class SitesController {
  constructor(
    private readonly generateSite: GenerateSiteUseCase,
    private readonly sites: SiteUseCases,
  ) {}

  @Get()
  get(): Promise<SiteDto> {
    return this.sites.get();
  }

  /** UC-40 : « Générer mon site » (le site est en ligne immédiatement). */
  @Post('generate')
  @Roles('ADMIN')
  @ApiZodBody(generateSiteSchema)
  generate(@ZodBody(generateSiteSchema) input: GenerateSiteInput): Promise<SiteDto> {
    return this.generateSite.execute(input.templateId);
  }

  /** UC-41 : enregistre le brouillon du thème (visible dans l'aperçu). */
  @Put('theme')
  @Roles('ADMIN')
  @ApiZodBody(updateDraftThemeSchema)
  updateTheme(@ZodBody(updateDraftThemeSchema) input: UpdateDraftThemeInput): Promise<SiteDto> {
    return this.sites.updateDraftTheme(input.settings);
  }

  @Post('theme/publish')
  @HttpCode(200)
  @Roles('ADMIN')
  publishTheme(): Promise<SiteDto> {
    return this.sites.publishTheme();
  }

  /** UC-42 */
  @Post('publish')
  @HttpCode(200)
  @Roles('ADMIN')
  publish(): Promise<SiteDto> {
    return this.sites.publish();
  }

  @Post('unpublish')
  @HttpCode(200)
  @Roles('ADMIN')
  unpublish(): Promise<SiteDto> {
    return this.sites.unpublish();
  }

  @Post('preview-token')
  @HttpCode(200)
  previewToken(): Promise<PreviewTokenDto> {
    return this.sites.createPreviewToken();
  }
}
