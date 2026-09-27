import { Inject, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_CONFIG, type AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { ObjectStorage, type PresignedUpload } from '../application/media.ports.js';

export function createS3Client(config: AppConfig): S3Client {
  return new S3Client({
    region: config.s3.region,
    ...(config.s3.endpoint ? { endpoint: config.s3.endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
}

/** Adapter S3 (RustFS en local, Cloudflare R2 en production). */
@Injectable()
export class S3ObjectStorage extends ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
    this.client = createS3Client(config);
    this.bucket = config.s3.bucket;
  }

  async presignPut(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
      { expiresIn: input.expiresInSeconds },
    );
    return {
      url,
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async head(key: string): Promise<{ contentLength: number; contentType?: string } | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { contentLength: result.ContentLength ?? 0, contentType: result.ContentType };
    } catch (error) {
      if (error instanceof NotFound || (error as { name?: string }).name === 'NotFound') return null;
      throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error(`Objet vide : ${key}`);
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Les déclinaisons ont une clé unique : elles peuvent être mises en cache indéfiniment.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  publicUrl(key: string): string {
    return `${this.config.media.publicBaseUrl}/${key}`;
  }
}
