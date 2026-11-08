/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="c564265c43cd446d624cab5a";
const ASSETS=[{"file":"administration.js","sha256":"7769931bf21c41853eb9ba64351a9eeb61c4dbdd836c4590cc6f5e2f5d580b29"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"0fb2a777a7c04346566f0cefa997cf32c5963c8a0eb329e10e0f5d073ab5d1a7"},{"file":"daily-style.css","sha256":"8bec15f6495981b07273605525777ead955d32c7d25983aa770bb3eecfcd9d6a"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"a0c86891e47ce0b78c93178c14a9331d98652a91bc86e5bfb4960aa0804219be"},{"file":"manifest.webmanifest","sha256":"76969177c6a65f71fa728c61e32c9c46308065a8511e6cc15bad871a1ed375c6"},{"file":"master-style.css","sha256":"c6c0c011c0557170a9fece380dccf9fe8df7944ffb088c1f42e35b1cb16c25b3"},{"file":"master.html","sha256":"8962666270071928f0184cbad34e2606a21394405651e9ccb1fabfb78cb21b47"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-NYYATZRD.js","sha256":"e220b4dd4e95c009954e97b17e70af049e8becd881fedeac946b4d1858eb9a6e"},{"file":"module-RUPSSLJN.js","sha256":"5a92fb1d95c9876f46793fcb3b58695c1f607b764c5ecceade920121c9c16808"},{"file":"module-WAYF43NI.js","sha256":"be240dcc4919fc3175ae3548aa0c547dd29e5d0eb526b47c2a27dcada9465ef9"},{"file":"pwa-style.css","sha256":"03d8f380e5d09963cffbe318da7d7d2d02249900f65110e0fb37d2eb225ad195"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
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
