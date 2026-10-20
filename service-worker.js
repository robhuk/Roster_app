const CACHE_NAME = "roster-manager-xc-cache-v1";
const APP_FILES = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    // Only remove older caches belonging to this exact app namespace.
    // Saved roster data lives separately in app-specific localStorage and is not cleared.
    await Promise.all(keys.filter(k=>k.startsWith("roster-manager-xc-cache-")&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if(event.request.method!=="GET")return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).origin===self.location.origin){
      const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));
    }
    return response;
  }).catch(()=>caches.match("./index.html"))));
});
