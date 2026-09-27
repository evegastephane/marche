import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type MediaDto,
  type RequestUploadInput,
  requestUploadSchema,
  type UpdateMediaInput,
  updateMediaSchema,
  type UploadTicketDto,
} from '@marche/contracts';
import { ADMIN_API } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody } from '../../../shared/infrastructure/http/zod-validation.js';
import {
  CompleteMediaUploadUseCase,
  MediaQueries,
  RequestMediaUploadUseCase,
} from '../application/media.use-cases.js';

@ApiTags('médias')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/media`)
export class MediaController {
  constructor(
    private readonly requestUpload: RequestMediaUploadUseCase,
    private readonly completeUpload: CompleteMediaUploadUseCase,
    private readonly queries: MediaQueries,
  ) {}

  /** Étape 1 : obtenir une URL de téléversement (PUT direct vers le stockage). */
  @Post('upload-url')
  @ApiZodBody(requestUploadSchema)
  createUploadUrl(@ZodBody(requestUploadSchema) input: RequestUploadInput): Promise<UploadTicketDto> {
    return this.requestUpload.execute(input);
  }

  /** Étape 2 : confirmer l'envoi ; le traitement des déclinaisons démarre en arrière-plan. */
  @Post(':id/complete')
  @HttpCode(200)
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<MediaDto> {
    return this.completeUpload.execute(id);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MediaDto> {
    return this.queries.get(id);
  }

  @Patch(':id')
  @ApiZodBody(updateMediaSchema)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateMediaSchema) input: UpdateMediaInput,
  ): Promise<MediaDto> {
    return this.queries.updateAlt(id, input.alt);
  }
}
