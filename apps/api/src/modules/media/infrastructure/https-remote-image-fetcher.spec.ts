import { describe, expect, it } from 'vitest';
import { HttpsRemoteImageFetcher, isPublicAddress, sniffImageType } from './https-remote-image-fetcher.js';

describe('Photos importées depuis un lien : protections', () => {
  it('refuse les adresses internes (réseau local, machine, métadonnées cloud), IPv6 comprises', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.5',
      '192.168.1.181',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fe80::1',
      'fd00::5',
      '::ffff:10.0.0.1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
    ]) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });

  it('accepte les adresses publiques', () => {
    for (const address of ['208.80.154.240', '151.101.1.140', '2620:0:862:ed1a::1', '::ffff:151.101.1.140']) {
      expect(isPublicAddress(address), address).toBe(true);
    }
  });

  it('reconnaît une image à ses premiers octets, pas à ce que le site annonce', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(sniffImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))).toBe('image/webp');
    expect(sniffImageType(Buffer.from('\0\0\0\x1cftypavif\0\0', 'latin1'))).toBe('image/avif');
    expect(sniffImageType(Buffer.from('<!doctype html><html>', 'latin1'))).toBeNull();
    expect(sniffImageType(Buffer.from('GIF89a', 'latin1'))).toBeNull();
  });

  it('refuse les liens non https et ceux qui visent la machine, avant toute requête utile', async () => {
    const fetcher = new HttpsRemoteImageFetcher();
    await expect(fetcher.fetch('http://example.com/photo.jpg')).rejects.toThrow(/https/);
    await expect(fetcher.fetch('https://user:secret@example.com/photo.jpg')).rejects.toThrow(/identifiants/);
    await expect(fetcher.fetch('https://127.0.0.1/photo.jpg')).rejects.toThrow(/adresse interne/);
    await expect(fetcher.fetch('https://localhost/photo.jpg')).rejects.toThrow(/adresse interne/);
    await expect(fetcher.fetch('https://2130706433/photo.jpg')).rejects.toThrow(/adresse interne/);
    await expect(fetcher.fetch('https://[::ffff:7f00:1]/photo.jpg')).rejects.toThrow(/adresse interne/);
    await expect(fetcher.fetch('https://[::1]/photo.jpg')).rejects.toThrow(/adresse interne/);
  });
});
