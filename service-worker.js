/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="927cd2419959bb70a854c511";
const ASSETS=[{"file":"administration.js","sha256":"6a17c6d6ebc3ccc83eba44ce3c7abeaa94a96e7e2ae0645489fa64bf3cf22cb5"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"1c46f396e9fe9d649425126e07646b0f04b6e93c55ab9b396b8b1372bc65dbd8"},{"file":"daily-style.css","sha256":"e1b607222576195244fc9ea92e0b7867c7c2540cc6aced8a5862f269fa1cf4b4"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"2b0ff172742832de20b8ffea8c3ec65ec46d10082d147cee28d521ee2bbe1333"},{"file":"manifest.webmanifest","sha256":"d94b3ce4f9a404f466fa9c8cf8c7c0ab7239ca4b994f85e11a8fda8580a4afaa"},{"file":"master-style.css","sha256":"29df06bf6042f82741b0a6442741e354a2cfaa8b807f3dd2b295e5bc480a0983"},{"file":"master.html","sha256":"294dd19b208a05dc2ce08e08793b5b08ff98d93cf4e83d37b8596fe8da3fe69b"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-EQ55ONZS.js","sha256":"45dfb198feb2963e734cb9e4ac90f0e12b691864b54d40dd69929b1e63db4954"},{"file":"module-SDLR7V4I.js","sha256":"37fa51a1ec07707c74ad42f74121bc3dfc61547be5ffa471ef1c96f1b75acefd"},{"file":"module-TINWMTZ5.js","sha256":"ffce194388371fd01549b0e90fb5958d24d61841becf6f3483ba2ef770e80954"},{"file":"pwa-style.css","sha256":"5ec31676fbece15aa35610bcc8d04e8493e9b965ff486c23912a2c2723af71c8"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
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
  if(url.search&&!(url.searchParams.size===1&&url.searchParams.has('v')&&!HTML.has(url.origin+url.pathname)))return null;
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
