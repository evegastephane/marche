import { Controller, Get, Header, HttpCode, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type CatalogImportQuery, catalogImportQuerySchema, type CatalogImportReportDto, MAX_IMPORT_BYTES } from '@marche/contracts';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { ADMIN_API, ApiScope } from '../../../shared/infrastructure/http/access.decorators.js';
import { ApiZodQuery, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { CatalogImportUseCase } from '../application/catalog-import/catalog-import.use-case.js';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('import')
@ApiBearerAuth()
@ApiScope('catalog')
@Controller(`${ADMIN_API}/imports/catalog`)
export class CatalogImportController {
  constructor(private readonly imports: CatalogImportUseCase) {}

  @Get('template')
  @Header('Content-Type', XLSX)
  @Header('Content-Disposition', 'attachment; filename="catalogue-modele.xlsx"')
  @ApiOperation({
    summary: 'Modèle d’import (.xlsx)',
    description: 'Feuilles PRODUCTS, VARIANTS, UNITS, ATTRIBUTES, ATTRIBUTE_VALUES, avec une colonne par attribut de la boutique.',
  })
  async template(): Promise<StreamableFile> {
    return new StreamableFile(await this.imports.template());
  }

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiZodQuery(catalogImportQuerySchema)
  @ApiOperation({
    summary: 'Importer un classeur',
    description:
      'dryRun=true (par défaut) vérifie tout sans écrire et rend le rapport. dryRun=false écrit tout dans une seule transaction, ou rien : 422 IMPORT_REJECTED avec le rapport dans details.',
  })
  async run(
    @UploadedFile() file: { buffer: Buffer; size: number } | undefined,
    @ZodQuery(catalogImportQuerySchema) query: CatalogImportQuery,
  ): Promise<CatalogImportReportDto> {
    if (!file || file.size === 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Joignez le classeur dans le champ « file »', { field: 'file' });
    }
    return this.imports.run(file.buffer, query.dryRun);
  }
}
