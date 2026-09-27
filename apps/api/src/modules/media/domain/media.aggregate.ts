import { ALLOWED_IMAGE_TYPES, type AllowedImageType, MAX_IMAGE_BYTES } from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ConflictError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export type MediaStatus = 'PENDING' | 'READY' | 'FAILED';

export interface MediaProps {
  storeId: string;
  /** Clé de l'objet original dans le stockage S3. */
  key: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  status: MediaStatus;
  /** Clés des déclinaisons webp, indexées par largeur. */
  renditions: Record<string, string>;
  createdAt: Date;
}

const EXTENSIONS: Record<AllowedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export class MediaNotUploadedError extends ValidationError {
  constructor(mediaId: string, reason: string) {
    super('MEDIA_NOT_UPLOADED', `Le fichier du média ${mediaId} n’est pas exploitable : ${reason}`);
  }
}

/** Image téléversée directement vers le stockage (URL pré-signée), puis déclinée par le worker. */
export class Media extends AggregateRoot {
  private constructor(
    id: string,
    private props: MediaProps,
  ) {
    super(id);
  }

  static requestUpload(
    input: { storeId: string; contentType: string; sizeBytes: number; alt?: string | null },
    now: Date,
  ): Media {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(input.contentType)) {
      throw new ValidationError('VALIDATION_FAILED', `Format d’image non accepté : ${input.contentType}`);
    }
    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
      throw new ValidationError('VALIDATION_FAILED', 'Image vide ou trop lourde (10 Mo maximum)');
    }
    const id = newId();
    const extension = EXTENSIONS[input.contentType as AllowedImageType];
    return new Media(id, {
      storeId: input.storeId,
      key: `${input.storeId}/${id}/original.${extension}`,
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
      width: null,
      height: null,
      alt: input.alt ?? null,
      status: 'PENDING',
      renditions: {},
      createdAt: now,
    });
  }

  static reconstitute(id: string, props: MediaProps): Media {
    return new Media(id, { ...props, renditions: { ...props.renditions } });
  }

  get key(): string {
    return this.props.key;
  }

  get status(): MediaStatus {
    return this.props.status;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  snapshot(): Readonly<MediaProps> {
    return { ...this.props, renditions: { ...this.props.renditions } };
  }

  /** Le client a terminé l'envoi : on vérifie le fichier réel puis on demande son traitement. */
  confirmUpload(actual: { sizeBytes: number; contentType?: string }, now: Date): void {
    if (this.props.status !== 'PENDING') {
      throw new ConflictError('CONFLICT', 'Ce média a déjà été confirmé');
    }
    if (actual.sizeBytes <= 0 || actual.sizeBytes > MAX_IMAGE_BYTES) {
      throw new MediaNotUploadedError(this.id, 'taille invalide');
    }
    if (actual.contentType && actual.contentType !== this.props.mimeType) {
      throw new MediaNotUploadedError(this.id, `type ${actual.contentType} inattendu`);
    }
    this.props = { ...this.props, sizeBytes: actual.sizeBytes };
    this.record(
      createEvent('media.media.uploaded', this.props.storeId, this.id, { key: this.props.key }, now),
    );
  }

  markReady(result: { width: number; height: number; renditions: Record<string, string> }): void {
    this.props = {
      ...this.props,
      width: result.width,
      height: result.height,
      renditions: { ...result.renditions },
      status: 'READY',
    };
  }

  markFailed(): void {
    this.props = { ...this.props, status: 'FAILED' };
  }

  updateAlt(alt: string | null): void {
    this.props = { ...this.props, alt };
  }
}
