/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // o service worker e o manifesto não podem ficar presos em cache antigo
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/manifest.webmanifest', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ]
  },
  experimental: {
    agentUpgrade: 'security',
  },
}

export default nextConfig
