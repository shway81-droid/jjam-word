/* 짬짬이 낱말 — 오프라인 캐시 (FR-09)

   network-first 전략: 인터넷이 있으면 항상 새 내용을 받아 캐시를 갱신하고,
   끊기면 캐시로 답한다. 문항을 추가해 배포했을 때 선생님이 옛 문항을 계속
   보는 일이 없어야 하므로 cache-first 를 쓰지 않는다. */
var CACHE = 'jjam-word-v1';

var ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/pick.js',
  './js/store.js',
  './js/sound.js',
  './js/chain.js',
  './shared/jjam-switcher.js',
  './data/words.json',
  './favicon.svg',
  './manifest.json',
  './assets/fonts/PretendardVariable.subset.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // 자매 사이트(다른 출처)는 캐시하지 않는다 — 저장소가 따로라 캐시해도 못 쓴다.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
