import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { newId } from '../../domain/id.js';
import type { AppConfig } from '../config/app-config.js';
import type { MarcheRequest } from '../http/marche-request.js';

/** Logs JSON (pino) enrichis de la boutique et de l'utilisateur ; lisibles (pino-pretty) en dev. */
export function createLoggerModule(config: AppConfig) {
  return LoggerModule.forRoot({
    pinoHttp: {
      level: config.logLevel,
      transport:
        config.env === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
          : undefined,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const header = req.headers['x-request-id'];
        const id = (Array.isArray(header) ? header[0] : header) ?? newId();
        res.setHeader('x-request-id', id);
        return id;
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-storefront-token"]',
          'req.headers["x-preview-token"]',
          'req.headers["svix-signature"]',
        ],
        remove: true,
      },
      customProps: (req: IncomingMessage) => {
        const actor = (req as MarcheRequest).actor;
        return actor ? { storeId: actor.storeId, userId: actor.userId } : {};
      },
      autoLogging: { ignore: (req: IncomingMessage) => req.url?.startsWith('/health') ?? false },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    },
  });
}
