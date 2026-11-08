/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="d9e75a04aa80755236b173ff";
const ASSETS=[{"file":"administration.js","sha256":"8bb4a3ec7964824f502685a5a350f5f4d1350a95e155ae611ffc17857231ac78"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"26aad0fbb0465c57e590d6cede1c4f1ca3c3455a2d68ec90643a45cfc8436ded"},{"file":"daily-style.css","sha256":"502ef52d71389c8754bbcdbb4aaf37cd911d21c83b3485f922e14cde0f59d69c"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"93b6b42b98ac18a9a0b19bdd65c4e7449a1d38ec642b53ec6c992041ff91e9ed"},{"file":"manifest.webmanifest","sha256":"d94b3ce4f9a404f466fa9c8cf8c7c0ab7239ca4b994f85e11a8fda8580a4afaa"},{"file":"master-style.css","sha256":"8af381c586dd8b9adf79c53ceee5c40220db1b3182ecb109ff9df9acf8098931"},{"file":"master.html","sha256":"77372d500ac58b4d994d5d5214cad661f505e076dfcb30c8f78f036adbe29f76"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-KKKCKBCT.js","sha256":"069169e1a4c2c746a7c7d314e089187b38a2dfc9db6e9f053cf6485901c0776f"},{"file":"module-PMOJPFS6.js","sha256":"59bc2b680a16f7a4e74990338b2eb08fb9300bce1d3ab59512b4592e6b519a7e"},{"file":"module-PNDQ4EEZ.js","sha256":"1e88e320f9e469e2342094263328af3526cb53228080eeb026a45bb2c2003ec4"},{"file":"pwa-style.css","sha256":"5ec31676fbece15aa35610bcc8d04e8493e9b965ff486c23912a2c2723af71c8"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
const ROOT=new URL('./',self.registration.scope);
const PREFIX='aviclaire-shell:'+ROOT.pathname+':';
const CACHE=PREFIX+RELEASE;
const STATIC=new Map(ASSETS.map(asset=>[new URL(asset.file,ROOT).href,asset]));
const HTML=new Set(['index.html','master.html'].map(file=>new URL(file,ROOT).href));

function canonical(request){
  if(request.method!=='GET'||request.headers.has('authorization'))return null;
  const url=new URL(request.url);
  if(url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname)||url.hash)return null;
  // Auth callbacks, exports and arbitrary query strings must always bypass the worker.
  if(url.search){
    const ownRelease=url.searchParams.size===1&&url.searchParams.get('release')===RELEASE;
    const legacyVersion=url.searchParams.size===1&&url.searchParams.has('v');
    if(HTML.has(url.origin+url.pathname)||url.pathname===ROOT.pathname||!(ownRelease||legacyVersion))return null;
  }
  url.search='';if(url.href===ROOT.href)url.pathname+='index.html';
  return STATIC.has(url.href)?url.href:null;
}

async function validated(response,asset){
  if(!response?.ok||response.redirected||response.type==='opaque')throw Error('Coque indisponible');
  const bytes=await response.clone().arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
  if(digest!==asset.sha256)throw Error('Version de coque différente');
  return response;
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  if(RELEASE.startsWith('__')||!STATIC.size)throw Error('Coque non construite');
  const cache=await caches.open(CACHE);
  try{
    for(const [href,asset] of STATIC){const response=await validated(await fetch(href,{credentials:'omit',cache:'reload',redirect:'error'}),asset);await cache.put(href,response);}
  }catch(error){await caches.delete(CACHE);throw error;}
  // No skipWaiting: a running form must never be replaced by another version.
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  // Existing pages keep their controller until closed; no clients.claim or forced reload.
})()));

self.addEventListener('fetch',event=>{
  const href=canonical(event.request);if(!href)return;
  event.respondWith((async()=>{
    const asset=STATIC.get(href),cache=await caches.open(CACHE);
    if(HTML.has(href)){
      // Accept online HTML only when all scripts/styles belong to this active shell.
      try{return await validated(await fetch(href,{credentials:'omit',cache:'no-cache',redirect:'error'}),asset);}catch{}
      const saved=await cache.match(href);if(saved)return saved;
      return new Response('Connexion nécessaire pour ouvrir Aviclaire.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
    const saved=await cache.match(href);if(saved)return saved;
    const response=await validated(await fetch(href,{credentials:'omit',redirect:'error'}),asset);await cache.put(href,response.clone());return response;
  })());
});
