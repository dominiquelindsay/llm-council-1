const CACHE_NAME = "llm-council-cache-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/vite.svg"
];

// Installs Service Worker and caches essential shell resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline shell assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Cleans up any legacy caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Destroying legacy cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intersection and fetch interceptor
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // STRICT RULE: Never cache live council API, streaming endpoints, or OpenRouter hooks
  if (url.includes("/api/") || url.includes("/stream") || event.request.method !== "GET") {
    return;
  }

  // Network-First with Stale Cache Fallback for maximum responsiveness
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache new static resources dynamically if valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If accessing document shell, return cached root
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("/");
          }
        });
      })
  );
});
