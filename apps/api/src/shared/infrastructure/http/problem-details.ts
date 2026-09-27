import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Problem } from '@marche/contracts';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';
import { DomainError, type DomainErrorKind } from '../../domain/domain-error.js';
import { RequestValidationError } from './zod-validation.js';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  validation: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
};

const TITLES: Record<number, string> = {
  400: 'Requête incorrecte',
  401: 'Authentification requise',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  409: 'Conflit',
  413: 'Requête trop volumineuse',
  422: 'Données invalides',
  429: 'Trop de requêtes',
  500: 'Erreur interne',
  503: 'Service indisponible',
};

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

export type ProblemResponse = Problem & { instance?: string };

function problem(
  status: number,
  code: string,
  detail: string | undefined,
  extra: Partial<ProblemResponse> = {},
): ProblemResponse {
  return {
    type: `urn:marche:problem:${code.toLowerCase().replace(/_/g, '-')}`,
    title: TITLES[status] ?? 'Erreur',
    status,
    code,
    ...(detail ? { detail } : {}),
    ...extra,
  };
}

/** Traduit une exception en problem+json (RFC 9457). Fonction pure, testée unitairement. */
export function toProblem(exception: unknown): ProblemResponse {
  if (exception instanceof RequestValidationError) {
    return problem(422, exception.code, exception.message, { errors: exception.errors });
  }
  if (exception instanceof DomainError) {
    return problem(
      STATUS_BY_KIND[exception.kind],
      exception.code,
      exception.message,
      exception.details !== undefined ? { details: exception.details } : {},
    );
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const body = typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : {};
    const code = typeof body.code === 'string' ? body.code : (CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`));
    const detail = typeof body.message === 'string' ? body.message : exception.message;
    return problem(status, code, status >= 500 ? undefined : detail);
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return problem(409, 'UNIQUE_VIOLATION', 'Cette valeur est déjà utilisée');
      case 'P2025':
        return problem(404, 'NOT_FOUND', 'Ressource introuvable');
      case 'P2003':
        return problem(422, 'VALIDATION_FAILED', 'Une ressource référencée n’existe pas');
      default:
        break;
    }
  }
  return problem(500, 'INTERNAL_ERROR', undefined);
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const body: ProblemResponse = { ...toProblem(exception), instance: request.originalUrl };

    if (body.status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} → ${body.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    if (response.headersSent) return;
    response.status(body.status).type('application/problem+json').json(body);
  }
}
