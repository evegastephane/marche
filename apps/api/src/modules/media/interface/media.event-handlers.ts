import { Injectable } from '@nestjs/common';
import type { SerializedDomainEvent } from '../../../shared/domain/domain-event.js';
import { OnDomainEvent } from '../../../shared/infrastructure/queue/on-domain-event.decorator.js';
import { ProcessUploadedMediaUseCase } from '../application/media.use-cases.js';

/** Abonnés du module media (exécutés par le worker). */
@Injectable()
export class MediaEventHandlers {
  constructor(private readonly processUploadedMedia: ProcessUploadedMediaUseCase) {}

  @OnDomainEvent({ event: 'media.media.uploaded', queue: 'media', name: 'process-image', attempts: 3 })
  onMediaUploaded(event: SerializedDomainEvent): Promise<void> {
    return this.processUploadedMedia.execute(event.aggregateId);
  }
}
