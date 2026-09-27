import { Module } from '@nestjs/common';
import { ImageProcessor, MediaRepository, ObjectStorage } from './application/media.ports.js';
import {
  CompleteMediaUploadUseCase,
  MediaQueries,
  ProcessUploadedMediaUseCase,
  RequestMediaUploadUseCase,
} from './application/media.use-cases.js';
import { PrismaMediaRepository } from './infrastructure/prisma-media.repository.js';
import { S3ObjectStorage } from './infrastructure/s3-object-storage.js';
import { SharpImageProcessor } from './infrastructure/sharp-image-processor.js';
import { MediaController } from './interface/media.controller.js';
import { MediaEventHandlers } from './interface/media.event-handlers.js';
import { MediaFacade } from './media.facade.js';

@Module({
  controllers: [MediaController],
  providers: [
    { provide: MediaRepository, useClass: PrismaMediaRepository },
    { provide: ObjectStorage, useClass: S3ObjectStorage },
    { provide: ImageProcessor, useClass: SharpImageProcessor },
    RequestMediaUploadUseCase,
    CompleteMediaUploadUseCase,
    MediaQueries,
    ProcessUploadedMediaUseCase,
    MediaEventHandlers,
    MediaFacade,
  ],
  exports: [MediaFacade],
})
export class MediaModule {}
