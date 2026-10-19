import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Image Docker (apps/storefront/Dockerfile) : serveur autonome, sans node_modules complet.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // En dev, chaque boutique est servie sur {slug}.localhost : Next doit accepter ces origines.
  allowedDevOrigins: ['*.localhost'],
};

export default config;
