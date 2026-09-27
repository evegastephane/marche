import type { MediaDto } from '@marche/contracts';

/** Source et srcset d'une image produit, à partir des déclinaisons webp générées par le worker. */
export function imageProps(media: MediaDto, sizes: string) {
  const widths = Object.keys(media.renditions)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    src: media.renditions['800'] ?? media.url,
    srcSet: widths.length ? widths.map((w) => `${media.renditions[String(w)]} ${w}w`).join(', ') : undefined,
    sizes,
    alt: media.alt ?? '',
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}
