/*
 * Service worker do Entrelinhas.
 * - Guarda as telas principais e os arquivos do app para abrir sem internet.
 * - Os dados ficam no aparelho (localStorage), então o app funciona offline depois da primeira visita.
 * - Nunca guarda /api (a IA precisa de internet).
 * Ao mudar este arquivo, suba a VERSAO para trocar o cache antigo.
 */
const VERSAO = 'v1'
const CACHE = `entrelinhas-${VERSAO}`
const TELAS = ['/', '/metas', '/diario', '/ajustes', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      // uma tela que falhar não impede a instalação das outras
      .then(cache => Promise.all(TELAS.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('entrelinhas-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const guardar = (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const copia = response.clone()
    caches.open(CACHE).then(cache => cache.put(request, copia))
  }
  return response
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // arquivos com nome versionado (JS, CSS, fontes) e ícones: do cache primeiro
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/illustrations/')) {
    event.respondWith(caches.match(request).then(salvo => salvo || fetch(request).then(resposta => guardar(request, resposta))))
    return
  }

  // telas e o resto: internet primeiro; sem conexão, a última versão guardada
  event.respondWith(
    fetch(request)
      .then(resposta => guardar(request, resposta))
      .catch(() =>
        caches.match(request).then(salvo => salvo || (request.mode === 'navigate' ? caches.match('/') : Response.error())),
      ),
  )
})
