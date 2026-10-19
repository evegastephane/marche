import { describe, expect, it } from 'vitest';
import { preferIpv4Loopback } from './app-config.js';

describe('preferIpv4Loopback', () => {
  it('remplace localhost par 127.0.0.1 hors production, identifiants et port compris', () => {
    expect(preferIpv4Loopback('redis://localhost:6379', 'development')).toBe('redis://127.0.0.1:6379');
    expect(preferIpv4Loopback('postgresql://marche:marche@localhost:5434/marche', 'test')).toBe(
      'postgresql://marche:marche@127.0.0.1:5434/marche',
    );
  });

  it('vaut aussi pour le stockage S3, sans ajouter de « / » final', () => {
    expect(preferIpv4Loopback('http://localhost:9000', 'development')).toBe('http://127.0.0.1:9000');
    expect(preferIpv4Loopback('http://localhost:9000/', 'development')).toBe('http://127.0.0.1:9000/');
    expect(preferIpv4Loopback('http://localhost:9000/marche-media', 'development')).toBe('http://127.0.0.1:9000/marche-media');
    expect(preferIpv4Loopback('https://s3.eu-west-3.amazonaws.com', 'development')).toBe('https://s3.eu-west-3.amazonaws.com');
  });

  it('laisse la production et les autres hôtes tels quels', () => {
    expect(preferIpv4Loopback('redis://localhost:6379', 'production')).toBe('redis://localhost:6379');
    expect(preferIpv4Loopback('redis://cache.internal:6379', 'development')).toBe('redis://cache.internal:6379');
    expect(preferIpv4Loopback('pas une url', 'development')).toBe('pas une url');
  });
});
