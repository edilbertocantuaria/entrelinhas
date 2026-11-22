import type { MetadataRoute } from 'next'

/** Manifesto do app instalável (PWA). O Next serve em /manifest.webmanifest e põe o link no <head>. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Entrelinhas: metas no seu ritmo',
    short_name: 'Entrelinhas',
    description: 'Metas anuais, tarefas do dia e um diário, sem pressão. Resumos do mês e retrospectiva do ano.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F1F8FB',
    theme_color: '#0A74BB',
    categories: ['productivity', 'lifestyle', 'health'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Hoje', short_name: 'Hoje', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Metas', short_name: 'Metas', url: '/metas', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Diário', short_name: 'Diário', url: '/diario', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
