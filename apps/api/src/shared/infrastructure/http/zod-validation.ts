import { Body, type PipeTransform, Query } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { ValidationError } from '../../domain/domain-error.js';

export interface FieldError {
  path: string;
  message: string;
}

/** Requête invalide (422 VALIDATION_FAILED), avec le détail champ par champ. */
export class RequestValidationError extends ValidationError {
  constructor(readonly errors: FieldError[]) {
    super('VALIDATION_FAILED', 'La requête contient des données invalides', { errors });
  }
}

/** Pipe de validation Zod maison (nestjs-zod n'est pas compatible Nest 12, cf. PLAN-CODE §0.2). */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new RequestValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}

export const ZodBody = <S extends z.ZodType>(schema: S): ParameterDecorator =>
  Body(new ZodValidationPipe(schema));

export const ZodQuery = <S extends z.ZodType>(schema: S): ParameterDecorator =>
  Query(new ZodValidationPipe(schema));

/** Type du schéma OpenAPI attendu par @ApiBody (non exporté directement par @nestjs/swagger). */
type SwaggerSchema = NonNullable<
  Extract<Parameters<typeof ApiBody>[0], { schema?: unknown }>['schema']
>;

/** Documente le corps d'une route dans Swagger à partir du schéma Zod. */
export const ApiZodBody = (schema: z.ZodType): MethodDecorator =>
  ApiBody({
    schema: z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      unrepresentable: 'any',
      io: 'input',
    }) as SwaggerSchema,
  });
