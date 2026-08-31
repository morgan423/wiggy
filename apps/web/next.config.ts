import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @wiggy/core est distribué en TypeScript source (monorepo) : Next doit le
  // transpiler comme le reste de l'app.
  transpilePackages: ['@wiggy/core', '@wiggy/api', '@wiggy/tokens', '@wiggy/copy'],
  experimental: {
    serverActions: {
      // A4 : cinq photos de 5 Mo passent par l'action de réservation. La
      // limite par défaut (1 Mo) rejetterait la première photo d'iPhone venue.
      bodySizeLimit: '28mb',
    },
  },
}

export default nextConfig
