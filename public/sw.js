/**
 * Service Worker de Limpeza e Migração
 * UEPG Pesquisa Clínica Odontológica
 *
 * Desativa interceptações agressivas de requisição HTTP para evitar bloqueio
 * da navegação do Next.js e permitir que todas as alterações sejam enviadas
 * ao servidor imediatamente.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            if (client.url && 'navigate' in client) {
              client.navigate(client.url);
            }
          });
        });
      })
  );
});

// Não intercepta requisições de fetch para não bloquear Next.js ou APIs
