import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  MAX_IMAGE_BYTES,
  type MediaDto,
  type UploadTicketDto,
} from '@marche/contracts';
import { useCallback } from 'react';
import { ApiError } from '@/shared/api/client';
import { useApi } from '@/shared/api/use-api';

/** Refus côté navigateur, avant tout envoi : format ou poids. */
export function imageProblem(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `« ${file.name} » : formats acceptés JPEG, PNG, WebP, AVIF.`;
  }
  if (file.size > MAX_IMAGE_BYTES) return `« ${file.name} » dépasse 10 Mo.`;
  return null;
}

/**
 * Téléversement d'une image en trois temps : l'API délivre une URL signée, le navigateur y dépose
 * le fichier directement (sans repasser par l'API), puis l'API confirme et lance les déclinaisons webp.
 */
export function useUploadImage() {
  const api = useApi();
  return useCallback(
    async (file: File, alt?: string): Promise<MediaDto> => {
      const ticket = await api<UploadTicketDto>('POST', '/api/v1/media/upload-url', {
        body: { fileName: file.name, contentType: file.type as AllowedImageType, sizeBytes: file.size, alt },
      });
      let upload: Response;
      try {
        upload = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file });
      } catch {
        throw new ApiError(0, 'NETWORK', 'Envoi de l’image impossible. Vérifiez votre connexion.', null);
      }
      if (!upload.ok) throw new ApiError(upload.status, 'UPLOAD_FAILED', 'Le stockage a refusé l’image. Réessayez.', null);
      return api<MediaDto>('POST', `/api/v1/media/${ticket.media.id}/complete`);
    },
    [api],
  );
}

/** Meilleure image à afficher : la déclinaison demandée si elle existe, sinon l'original. */
export function mediaSrc(media: MediaDto, width: '400' | '800' | '1600' = '400'): string {
  return media.renditions[width] ?? media.url;
}
