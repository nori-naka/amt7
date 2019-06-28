const CACHE_NAME = 'cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './beacon.js',
    './exif.js',
    './flip.js',
    './map.js',
    './user_list.js',
    './rtc.js',
    './css/ol.css',
    './css/spectrum.css',
    './css/style.css',
    './js/jquery-3.3.1.min.js',
    './js/jquery.spectrum-ja.js',
    './js/jquery.tinycolorpicker.min.js',
    './js/ol.js'
];

const no_urlsToCache = [
    '/RECORD_layer/position.json',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', (event) => {
    var cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method == "POST") return;

    const pathname = new URL(event.request.url).pathname
    no_urlsToCache.forEach((url_str)=>{
        if (url_str == pathname) return;
    });

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                let fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        let responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});