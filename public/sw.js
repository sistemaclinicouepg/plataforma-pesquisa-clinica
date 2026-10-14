/**
 * Service Worker para Modo Offline e PWA
 * UEPG Pesquisa Clínica Odontológica
 */

const CACHE_NAME = 'uepg-clinica-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/paciente',
  '/dashboard',
  '/projetos',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalação: Cache dos recursos essenciais do shell da aplicação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pré-armazenando shell da aplicação');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[ServiceWorker] Aviso ao pré-carregar recursos:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[ServiceWorker] Removendo cache antigo:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interceptação de requisições: Network-First com fallback de cache
self.addEventListener('fetch', (event) => {
  // Ignora chamadas de API internas para não mascarar erros de backend ou autenticação
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Apenas métodos GET são cacheados
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta for válida, clonar e salvar no cache para uso offline
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith('http')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Sem conexão: Tenta recuperar do cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se for requisição de navegação HTML, retornar a página apropriada
        if (event.request.mode === 'navigate') {
          const fallback =
            (await caches.match('/paciente')) ||
            (await caches.match('/dashboard')) ||
            (await caches.match('/'));
          if (fallback) return fallback;
        }

        return new Response('Offline - Conteúdo indisponível sem conexão', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      })
  );
});
