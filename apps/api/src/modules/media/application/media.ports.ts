import type { AllowedImageType } from '@marche/contracts';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import type { Media } from '../domain/media.aggregate.js';

export abstract class MediaRepository {
  abstract findById(id: string): Promise<Media | null>;
  abstract findManyByIds(ids: readonly string[]): Promise<Media[]>;
  /** Photo déjà importée depuis ce lien (hors échec), dans la boutique courante. */
  abstract findBySourceUrl(url: string): Promise<Media | null>;
  abstract insert(media: Media): Promise<void>;
  abstract update(media: Media): Promise<void>;
}

export interface PresignedUpload {
  url: string;
  headers: Record<string, string>;
  expiresAt: Date;
}

/** Stockage objet compatible S3 (RustFS en local, Cloudflare R2 en production). */
export abstract class ObjectStorage {
  abstract presignPut(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<PresignedUpload>;
  abstract head(key: string): Promise<{ contentLength: number; contentType?: string } | null>;
  abstract get(key: string): Promise<Buffer>;
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract publicUrl(key: string): string;
}

export interface ProcessedImage {
  width: number;
  height: number;
  renditions: { width: number; body: Buffer; contentType: string; extension: string }[];
}

export interface RemoteImage {
  body: Buffer;
  contentType: AllowedImageType;
}

/** Photo introuvable ou refusée derrière un lien (site injoignable, pas une image, trop lourde…). */
export class RemoteImageError extends ValidationError {
  constructor(reason: string) {
    super('IMAGE_FETCH_FAILED', `Photo non récupérée : ${reason}`);
  }
}

/** Téléchargement d'une photo depuis un lien https public, avec toutes les protections du serveur. */
export abstract class RemoteImageFetcher {
  abstract fetch(url: string): Promise<RemoteImage>;
}

/** Redimensionnement et conversion des images (sharp). */
export abstract class ImageProcessor {
  abstract process(original: Buffer, widths: readonly number[]): Promise<ProcessedImage>;
}
