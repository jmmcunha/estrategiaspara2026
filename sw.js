// =====================================================
// SERVICE WORKER - Painel Executivo de Projetos
// Versão: 1.0.0
// =====================================================

const CACHE_NAME = 'painel-executivo-v3';
const OFFLINE_URL = '/offline.html';

// Arquivos essenciais para cache (funcionamento offline)
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/utils.js',
    '/files.js',
    '/import.js',
    '/export.js',
    '/reports.js',
    '/reminders.js',
    '/settings.js',
    '/review.js',
    '/firebase-config.js',
    '/manifest.json',
    '/offline.html',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Recursos externos (CDNs) - cache com fallback
const CDN_CACHE = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// =====================================================
// INSTALAÇÃO
// =====================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cache aberto, adicionando arquivos estáticos...');
                // Adiciona arquivos estáticos
                return cache.addAll(STATIC_CACHE)
                    .then(() => {
                        console.log('[SW] Arquivos estáticos em cache');
                        // Tenta adicionar CDNs (pode falhar, não é crítico)
                        return Promise.allSettled(
                            CDN_CACHE.map(url => 
                                cache.add(url).catch(err => 
                                    console.log(`[SW] CDN não cacheado: ${url}`)
                                )
                            )
                        );
                    });
            })
            .then(() => {
                console.log('[SW] Instalação completa');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erro na instalação:', error);
            })
    );
});

// =====================================================
// ATIVAÇÃO
// =====================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[SW] Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker ativado');
                return self.clients.claim();
            })
    );
});

// =====================================================
// INTERCEPTAÇÃO DE REQUISIÇÕES (FETCH)
// =====================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignora requisições não-GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignora requisições do Firebase (precisam estar online)
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebaseio.com')) {
        return;
    }
    
    // Estratégia: Network First com fallback para cache
    event.respondWith(
        networkFirstStrategy(request)
    );
});

// =====================================================
// ESTRATÉGIAS DE CACHE
// =====================================================

// Network First: Tenta rede primeiro, depois cache
async function networkFirstStrategy(request) {
    try {
        // Tenta buscar da rede
        const networkResponse = await fetch(request);
        
        // Se sucesso, atualiza o cache
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Se falhar, busca do cache
        console.log('[SW] Rede indisponível, buscando do cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Se for navegação e não tiver cache, mostra página offline
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match(OFFLINE_URL);
            if (offlinePage) {
                return offlinePage;
            }
        }
        
        // Retorna erro genérico
        return new Response('Conteúdo não disponível offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// =====================================================
// SINCRONIZAÇÃO EM BACKGROUND (para futuras funcionalidades)
// =====================================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);
    
    if (event.tag === 'sync-projects') {
        event.waitUntil(syncProjects());
    }
});

async function syncProjects() {
    // Implementação futura para sincronização offline
    console.log('[SW] Sincronizando projetos...');
}

// =====================================================
// NOTIFICAÇÕES PUSH (para futuras funcionalidades)
// =====================================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push recebido');
    
    const options = {
        body: event.data ? event.data.text() : 'Nova atualização disponível',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Fechar' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Painel Executivo', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada');
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// =====================================================
// MENSAGENS DO CLIENTE
// =====================================================
self.addEventListener('message', (event) => {
    console.log('[SW] Mensagem recebida:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache limpo');
        });
    }
});
