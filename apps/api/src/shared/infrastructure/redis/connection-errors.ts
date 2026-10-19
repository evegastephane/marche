import { Logger } from '@nestjs/common';

const logger = new Logger('Redis');

/** Codes d'une connexion coupée ou impossible : ioredis et BullMQ se reconnectent seuls. */
const CONNECTION_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EHOSTUNREACH']);

/** Un message par minute au plus pour un même code : chaque file et chaque worker a sa propre connexion. */
const REPORT_EVERY_MS = 60_000;
const lastReport = new Map<string, number>();
const muted = new Map<string, Set<string>>();

/**
 * Erreur remontée par une connexion Redis (client applicatif, file ou worker BullMQ).
 * Sans écouteur, BullMQ l'écrit brute dans la console, une fois par connexion : après une mise en veille
 * ou un redémarrage de Redis, cela fait des dizaines de piles « read ECONNRESET ». Ici, une ligne claire
 * par minute, qui dit combien de connexions sont touchées ; les autres erreurs restent signalées une à une.
 */
export function reportRedisError(source: string, error: unknown): void {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (!code || !CONNECTION_CODES.has(code)) {
    logger.error(`${source} : ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const now = Date.now();
  const sources = muted.get(code) ?? new Set<string>();
  sources.add(source);
  muted.set(code, sources);
  if (now - (lastReport.get(code) ?? 0) < REPORT_EVERY_MS) return;
  lastReport.set(code, now);
  logger.warn(
    `Connexion à Redis perdue (${code}) sur ${sources.size} connexion${sources.size > 1 ? 's' : ''} (${[...sources].slice(0, 4).join(', ')}${
      sources.size > 4 ? '…' : ''
    }) : reconnexion automatique en cours.`,
  );
  sources.clear();
}
