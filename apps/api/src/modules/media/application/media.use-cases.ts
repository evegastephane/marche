import { Injectable, Logger } from '@nestjs/common';
import {
  IMAGE_RENDITION_WIDTHS,
  type MediaDto,
  type RequestUploadInput,
  type UploadTicketDto,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { Media, MediaNotUploadedError } from '../domain/media.aggregate.js';
import { ImageProcessor, MediaRepository, ObjectStorage } from './media.ports.js';

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export function toMediaDto(media: Media, storage: ObjectStorage): MediaDto {
  const m = media.snapshot();
  return {
    id: media.id,
    status: m.status,
    url: storage.publicUrl(m.key),
    alt: m.alt,
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
    renditions: Object.fromEntries(
      Object.entries(m.renditions).map(([width, key]) => [width, storage.publicUrl(key)]),
    ),
  };
}

/** UC-13 (1/2) : prépare un téléversement direct vers le stockage (URL PUT pré-signée, 5 min). */
@Injectable()
export class RequestMediaUploadUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  async execute(input: RequestUploadInput): Promise<UploadTicketDto> {
    const media = Media.requestUpload(
      { storeId: this.actor.storeId, contentType: input.contentType, sizeBytes: input.sizeBytes, alt: input.alt },
      this.clock.now(),
    );
    await this.media.insert(media);
    const upload = await this.storage.presignPut({
      key: media.key,
      contentType: input.contentType,
      contentLength: input.sizeBytes,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    });
    return {
      media: toMediaDto(media, this.storage),
      uploadUrl: upload.url,
      method: 'PUT',
      headers: upload.headers,
      expiresAt: upload.expiresAt.toISOString(),
    };
  }
}

/** UC-13 (2/2) : le fichier est arrivé ; le worker va générer les déclinaisons. */
@Injectable()
export class CompleteMediaUploadUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly clock: Clock,
  ) {}

  async execute(mediaId: string): Promise<MediaDto> {
    const media = await this.media.findById(mediaId);
    if (!media) throw new NotFoundError('Média', mediaId);
    const object = await this.storage.head(media.key);
    if (!object) throw new MediaNotUploadedError(mediaId, 'fichier absent du stockage');
    media.confirmUpload(
      { sizeBytes: object.contentLength, contentType: object.contentType },
      this.clock.now(),
    );
    await this.uow.run(async () => {
      await this.media.update(media);
      await this.outbox.addAll(media.pullEvents());
    });
    return toMediaDto(media, this.storage);
  }
}

@Injectable()
export class MediaQueries {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async get(mediaId: string): Promise<MediaDto> {
    const media = await this.media.findById(mediaId);
    if (!media) throw new NotFoundError('Média', mediaId);
    return toMediaDto(media, this.storage);
  }

  async updateAlt(mediaId: string, alt: string | null): Promise<MediaDto> {
    const media = await this.media.findById(mediaId);
    if (!media) throw new NotFoundError('Média', mediaId);
    media.updateAlt(alt);
    await this.media.update(media);
    return toMediaDto(media, this.storage);
  }
}

/** Worker : génère les déclinaisons webp (400/800/1600 px) d'une image confirmée. Idempotent. */
@Injectable()
export class ProcessUploadedMediaUseCase {
  private readonly logger = new Logger(ProcessUploadedMediaUseCase.name);

  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
    private readonly images: ImageProcessor,
  ) {}

  async execute(mediaId: string): Promise<void> {
    const media = await this.media.findById(mediaId);
    if (!media || media.status === 'READY') return;
    try {
      const original = await this.storage.get(media.key);
      const processed = await this.images.process(original, IMAGE_RENDITION_WIDTHS);
      const renditions: Record<string, string> = {};
      for (const rendition of processed.renditions) {
        const key = `${media.storeId}/${media.id}/w${rendition.width}.${rendition.extension}`;
        await this.storage.put(key, rendition.body, rendition.contentType);
        renditions[String(rendition.width)] = key;
      }
      media.markReady({ width: processed.width, height: processed.height, renditions });
    } catch (error) {
      this.logger.error(`Traitement impossible du média ${media.id}`, error);
      media.markFailed();
      await this.media.update(media);
      throw error;
    }
    await this.media.update(media);
  }
}
