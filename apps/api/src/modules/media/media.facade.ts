import { Injectable } from '@nestjs/common';
import type { MediaDto } from '@marche/contracts';
import { ValidationError } from '../../shared/domain/domain-error.js';
import { MediaRepository, ObjectStorage } from './application/media.ports.js';
import { toMediaDto } from './application/media.use-cases.js';

/** API publique du module media. */
@Injectable()
export class MediaFacade {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
  ) {}

  /** Médias de la boutique courante, indexés par id (les ids inconnus sont ignorés). */
  async getMany(ids: readonly string[]): Promise<Map<string, MediaDto>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const found = await this.media.findManyByIds(unique);
    return new Map(found.map((media) => [media.id, toMediaDto(media, this.storage)]));
  }

  /** Vérifie que les médias existent dans la boutique et ne sont pas en échec. */
  async assertUsable(ids: readonly string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const found = await this.media.findManyByIds(unique);
    const usable = new Set(found.filter((m) => m.status !== 'FAILED').map((m) => m.id));
    const invalid = unique.filter((id) => !usable.has(id));
    if (invalid.length > 0) {
      throw new ValidationError('VALIDATION_FAILED', 'Certains médias sont introuvables ou inutilisables', {
        mediaIds: invalid,
      });
    }
  }
}
