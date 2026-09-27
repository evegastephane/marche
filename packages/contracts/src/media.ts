import { z } from 'zod';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Taille maximale d'une image téléversée : 10 Mo. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Largeurs des déclinaisons webp générées par le worker. */
export const IMAGE_RENDITION_WIDTHS = [400, 800, 1600] as const;

export const requestUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_IMAGE_TYPES, {
    error: 'Formats acceptés : JPEG, PNG, WebP, AVIF',
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_BYTES, { error: 'Image trop lourde (10 Mo maximum)' }),
  alt: z.string().trim().max(200).optional(),
});
export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

export const updateMediaSchema = z.object({
  alt: z.string().trim().max(200).nullable(),
});
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export type MediaStatus = 'PENDING' | 'READY' | 'FAILED';

export interface MediaDto {
  id: string;
  status: MediaStatus;
  /** URL de l'original. */
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  /** URL des déclinaisons webp, indexées par largeur ("400", "800", "1600"). */
  renditions: Record<string, string>;
}

export interface UploadTicketDto {
  media: MediaDto;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}
