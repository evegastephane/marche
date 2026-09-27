import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // En dev, chaque boutique est servie sur {slug}.localhost : Next doit accepter ces origines.
  allowedDevOrigins: ['*.localhost'],
};

export default config;
