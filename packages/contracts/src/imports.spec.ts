import { describe, expect, it } from 'vitest';
import { IMPORT_COLUMNS, parseImageUrls } from './imports.js';

describe('parseImageUrls (colonne « images » de l’import)', () => {
  it('lit plusieurs liens séparés par |, ; , espaces ou retours à la ligne, sans doublon', () => {
    const raw = 'https://a.example/1.jpg | https://a.example/2.jpg;https://a.example/3.jpg\nhttps://a.example/1.jpg  https://b.example/x.png';
    expect(parseImageUrls(raw)).toEqual({
      urls: ['https://a.example/1.jpg', 'https://a.example/2.jpg', 'https://a.example/3.jpg', 'https://b.example/x.png'],
      invalid: [],
    });
  });

  it('refuse ce qui n’est pas un lien https vers un nom de domaine', () => {
    const { urls, invalid } = parseImageUrls('http://a.example/1.jpg photo.jpg https://localhost/x.jpg ftp://a.example/y https://ok.example/z.webp');
    expect(urls).toEqual(['https://ok.example/z.webp']);
    expect(invalid).toEqual(['http://a.example/1.jpg', 'photo.jpg', 'https://localhost/x.jpg', 'ftp://a.example/y']);
  });

  it('les colonnes de photos sont des colonnes fixes, pas des attributs', () => {
    expect(IMPORT_COLUMNS.PRODUCTS).toContain('images');
    expect(IMPORT_COLUMNS.VARIANTS).toContain('image');
  });
});
