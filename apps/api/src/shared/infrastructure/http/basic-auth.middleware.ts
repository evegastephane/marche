import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Authentification HTTP basique (protège Bull Board). */
export function basicAuth(user: string, password: string, realm = 'Marché') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [givenUser, ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      if (safeEqual(givenUser ?? '', user) && safeEqual(rest.join(':'), password)) {
        next();
        return;
      }
    }
    res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
    res.status(401).send('Authentification requise');
  };
}
