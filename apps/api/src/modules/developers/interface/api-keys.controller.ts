import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type ApiKeyDto,
  type CreateApiKeyInput,
  type CreatedApiKeyDto,
  createApiKeySchema,
  type UpdateApiKeyInput,
  updateApiKeySchema,
} from '@marche/contracts';
import { ADMIN_API, Roles } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodBody, ZodBody } from '../../../shared/infrastructure/http/zod-validation.js';
import { ApiKeyUseCases } from '../application/api-keys.use-cases.js';

/** Réservé aux administrateurs, avec leur session : une clé d'API ne gère jamais les clés. */
@ApiTags('développeurs')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller(`${ADMIN_API}/developers/api-keys`)
export class ApiKeysController {
  constructor(private readonly keys: ApiKeyUseCases) {}

  @Get()
  @ApiOperation({ summary: 'Clés d’API de la boutique', description: 'Actives d’abord ; une clé secrète ne montre que son début et sa fin.' })
  list(): Promise<ApiKeyDto[]> {
    return this.keys.list();
  }

  @Post()
  @ApiOperation({
    summary: 'Créer une clé',
    description:
      'PUBLISHABLE (pk_) : /storefront/v1 depuis le navigateur, limitée aux origines déclarées. SECRET (sk_) : /api/v1 depuis un serveur, avec les droits accordés. `secret` n’est renvoyé qu’à la création.',
  })
  @ApiZodBody(createApiKeySchema)
  create(@ZodBody(createApiKeySchema) input: CreateApiKeyInput): Promise<CreatedApiKeyDto> {
    return this.keys.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer une clé, changer ses origines ou ses droits' })
  @ApiZodBody(updateApiKeySchema)
  update(@Param('id', ParseUUIDPipe) id: string, @ZodBody(updateApiKeySchema) input: UpdateApiKeyInput): Promise<ApiKeyDto> {
    return this.keys.update(id, input);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @ApiOperation({ summary: 'Révoquer une clé', description: 'Irréversible : les applications qui l’utilisent perdent l’accès immédiatement.' })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<ApiKeyDto> {
    return this.keys.revoke(id);
  }
}
