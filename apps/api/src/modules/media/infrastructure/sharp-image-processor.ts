import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessor, type ProcessedImage } from '../application/media.ports.js';

/** Déclinaisons webp : jamais d'agrandissement, orientation EXIF appliquée, métadonnées retirées. */
@Injectable()
export class SharpImageProcessor extends ImageProcessor {
  async process(original: Buffer, widths: readonly number[]): Promise<ProcessedImage> {
    const image = sharp(original, { failOn: 'error' }).rotate();
    const metadata = await image.metadata();
    const sourceWidth = metadata.autoOrient?.width ?? metadata.width;
    const sourceHeight = metadata.autoOrient?.height ?? metadata.height;
    if (!sourceWidth || !sourceHeight) throw new Error('Dimensions de l’image illisibles');

    const targets = widths.filter((width) => width < sourceWidth);
    // Toujours au moins une déclinaison : à la taille d'origine si l'image est petite.
    if (targets.length === 0 || Math.max(...widths) >= sourceWidth) {
      targets.push(sourceWidth);
    }

    const renditions = await Promise.all(
      [...new Set(targets)].map(async (width) => ({
        width,
        body: await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
        contentType: 'image/webp',
        extension: 'webp',
      })),
    );
    return { width: sourceWidth, height: sourceHeight, renditions };
  }
}
