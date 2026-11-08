/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="01e3ba9a2c6aa8ff52a51d1f";
const ASSETS=[{"file":"administration.js","sha256":"7aa7fde88f402e21d339786ec7edb8177429de435a3f92a51c249d072378d945"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"17c1312f156cb005f010c88fa34453e9d6f1d8194dc462fe39f80b27502a38cc"},{"file":"daily-style.css","sha256":"502ef52d71389c8754bbcdbb4aaf37cd911d21c83b3485f922e14cde0f59d69c"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"72d3c98f4ab1604bf2c6bf6a2859091261004d00759cfa1c97efd5570d9c0fb7"},{"file":"manifest.webmanifest","sha256":"d94b3ce4f9a404f466fa9c8cf8c7c0ab7239ca4b994f85e11a8fda8580a4afaa"},{"file":"master-style.css","sha256":"8af381c586dd8b9adf79c53ceee5c40220db1b3182ecb109ff9df9acf8098931"},{"file":"master.html","sha256":"61283f46ce4e9cc494f26e5b6397ec8050e69842da524ded348a6fd12881888f"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-KKKCKBCT.js","sha256":"069169e1a4c2c746a7c7d314e089187b38a2dfc9db6e9f053cf6485901c0776f"},{"file":"module-PMOJPFS6.js","sha256":"59bc2b680a16f7a4e74990338b2eb08fb9300bce1d3ab59512b4592e6b519a7e"},{"file":"module-QRWZGNGM.js","sha256":"723941f0a49775bcec59b8e00bb0dee3d05b96070b4dd44e39192f8cc6619443"},{"file":"pwa-style.css","sha256":"5ec31676fbece15aa35610bcc8d04e8493e9b965ff486c23912a2c2723af71c8"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
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
