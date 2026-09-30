import { createHash, randomBytes } from 'node:crypto';
import { API_KEY_PREFIXES, type ApiKeyKind } from '@marche/contracts';

/** 32 caractères base62 : environ 190 bits d'aléa, lisibles et copiables d'un double-clic. */
const BODY_LENGTH = 32;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function randomBody(): string {
  // Tirage par rejet : pas de biais de modulo sur l'alphabet de 62 signes.
  let body = '';
  while (body.length < BODY_LENGTH) {
    for (const byte of randomBytes(BODY_LENGTH * 2)) {
      if (byte < 248 && body.length < BODY_LENGTH) body += ALPHABET[byte % 62];
    }
  }
  return body;
}

/** Empreinte stockée : une clé à fort aléa n'a pas besoin de sel ni d'étirement. */
export function hashApiKey(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export interface GeneratedApiKey {
  token: string;
  tokenHash: string;
  prefix: string;
  last4: string;
}

export function generateApiKey(kind: ApiKeyKind): GeneratedApiKey {
  const prefix = API_KEY_PREFIXES[kind];
  const token = `${prefix}${randomBody()}`;
  return { token, tokenHash: hashApiKey(token), prefix, last4: token.slice(-4) };
}

/** Une chaîne a la forme d'une clé : sk_ ou pk_ suivi du corps base62. */
export function looksLikeApiKey(value: string): { kind: ApiKeyKind } | null {
  const pattern = new RegExp(`^(pk|sk)_[0-9A-Za-z]{${BODY_LENGTH}}$`);
  const match = pattern.exec(value);
  if (!match) return null;
  return { kind: match[1] === 'pk' ? 'PUBLISHABLE' : 'SECRET' };
}
