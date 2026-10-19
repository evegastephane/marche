import { type LookupAddress, lookup as dnsLookup } from 'node:dns';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import { type AllowedImageType, MAX_IMAGE_BYTES } from '@marche/contracts';
import { RemoteImageError, type RemoteImage, RemoteImageFetcher } from '../application/media.ports.js';

const MAX_REDIRECTS = 3;
/** Délai sans données reçues, puis délai total d'un téléchargement. */
const IDLE_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 30_000;
/** Wikimedia et d'autres hébergeurs exigent un agent qui se présente. */
const USER_AGENT = 'UpsellCatalogImport/1.0 (import de photos de produits)';

/**
 * Adresses qu'un lien de photo ne doit jamais atteindre : réseau local, machine elle-même, métadonnées
 * des hébergeurs cloud (169.254.169.254), plages réservées. Sans ce filtre, un fichier d'import pourrait
 * faire interroger par le serveur ses propres services internes (SSRF).
 */
const BLOCKED = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6');
}

/** IPv4 écrite en IPv6 (« ::ffff:10.0.0.1 » ou « ::ffff:a00:1 ») ; null sinon. */
function mappedIpv4(address: string): string | null {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (dotted?.[1]) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (!hex?.[1] || !hex[2]) return null;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

/** Adresse IP publique, joignable sans risque ; les IPv4 notées en IPv6 sont ramenées à l'IPv4. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !BLOCKED.check(address, 'ipv4');
  if (family === 6) {
    const mapped = mappedIpv4(address);
    if (mapped) return !BLOCKED.check(mapped, 'ipv4');
    return !BLOCKED.check(address, 'ipv6');
  }
  return false;
}

/** Nature réelle du fichier, lue dans ses premiers octets (l'en-tête Content-Type peut mentir). */
export function sniffImageType(body: Buffer): AllowedImageType | null {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return 'image/jpeg';
  if (body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (body.length >= 12 && body.toString('latin1', 0, 4) === 'RIFF' && body.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (body.length >= 12 && body.toString('latin1', 4, 8) === 'ftyp') {
    const brand = body.toString('latin1', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** Résolution DNS qui refuse les adresses internes, au moment même de la connexion (pas de contournement par DNS). */
function safeLookup(hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '');
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((entry) => !isPublicAddress(entry.address))) {
      const blocked = Object.assign(new Error('adresse interne refusée'), { code: 'EBLOCKED' });
      return callback(blocked, '');
    }
    if (options.all) return callback(null, list);
    const first = list[0]!;
    callback(null, first.address, first.family);
  });
}

/**
 * Télécharge une photo depuis un lien https public : redirections suivies (3 au plus, https seulement),
 * 10 Mo au plus, JPEG, PNG, WebP ou AVIF reconnus à leurs octets, délais bornés.
 */
@Injectable()
export class HttpsRemoteImageFetcher extends RemoteImageFetcher {
  async fetch(url: string): Promise<RemoteImage> {
    const deadline = Date.now() + TOTAL_TIMEOUT_MS;
    let current = url;
    for (let redirects = 0; ; redirects += 1) {
      const target = parseHttps(current);
      const response = await this.request(target, deadline);
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) throw new RemoteImageError('trop de redirections');
        current = new URL(response.headers.location, target).href;
        continue;
      }
      if (status !== 200) {
        response.resume();
        throw new RemoteImageError(`le site a répondu ${status}`);
      }
      const body = await readLimited(response, deadline);
      const contentType = sniffImageType(body);
      if (!contentType) throw new RemoteImageError('ce lien ne renvoie pas une image JPEG, PNG, WebP ou AVIF');
      return { body, contentType };
    }
  }

  private request(target: URL, deadline: number): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const request = https.get(
        target,
        {
          lookup: safeLookup as never,
          headers: { 'User-Agent': USER_AGENT, Accept: 'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1' },
          timeout: Math.min(IDLE_TIMEOUT_MS, Math.max(1, deadline - Date.now())),
        },
        resolve,
      );
      request.on('timeout', () => request.destroy(new RemoteImageError('délai dépassé')));
      request.on('error', (error: NodeJS.ErrnoException) => {
        if (error instanceof RemoteImageError) return reject(error);
        if (error.code === 'EBLOCKED') return reject(new RemoteImageError('adresse interne refusée'));
        reject(new RemoteImageError(`site injoignable (${error.code ?? error.message})`));
      });
    });
  }
}

function parseHttps(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RemoteImageError('lien invalide');
  }
  if (url.protocol !== 'https:') throw new RemoteImageError('seuls les liens https sont acceptés');
  if (url.username || url.password) throw new RemoteImageError('lien avec identifiants refusé');
  // Une adresse IP écrite dans le lien ne passe pas par la résolution DNS : on la vérifie ici.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPublicAddress(host)) throw new RemoteImageError('adresse interne refusée');
  return url;
}

function readLimited(response: IncomingMessage, deadline: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(response.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      response.destroy();
      return reject(new RemoteImageError('image trop lourde (10 Mo maximum)'));
    }
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => response.destroy(new RemoteImageError('délai dépassé')), Math.max(1, deadline - Date.now()));
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        response.destroy(new RemoteImageError('image trop lourde (10 Mo maximum)'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    response.on('error', (error) => {
      clearTimeout(timer);
      reject(error instanceof RemoteImageError ? error : new RemoteImageError('téléchargement interrompu'));
    });
  });
}
