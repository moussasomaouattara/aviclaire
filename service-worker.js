/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="b2e7b42b80a4579a9e9e3f41";
const ASSETS=[{"file":"administration.js","sha256":"934070b53c8c8ecd9941d192a92df972e86ed3171ab0a495f1f952895f908b6b"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"363964ca8fbe40e807abfe2714422f4700fbbd0974d7341b0b9da22fa7fa88c4"},{"file":"daily-style.css","sha256":"5d329977e53f907584654c8bc14a5f93771c6814d255f6f530f8fa35581bf800"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"55220baa3eef320fd427bfee6972c8ce6a41db755bf0d62ff255e9356dd8a51c"},{"file":"manifest.webmanifest","sha256":"a72b09ee85f762ff0e6d3f1291f44021658a322d1e1fd0956060a8e88b3986ea"},{"file":"master-style.css","sha256":"9490791b3b6605b01e269782d6af6665c71bb94572add0482121ab120e3a41c3"},{"file":"master.html","sha256":"ff810fba3d9ca4280dd3ea956d2a34b12b0ae43e9e4d9b3ef1c995dc247735ef"},{"file":"module-3K4LUYAP.js","sha256":"d5c18f6338e89f80009c97f65f59806d0d763b128fe8eec9dbd8c172ee0dc3cc"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-GHOUSJXG.js","sha256":"1b680fd040e8c53ce3c4883229b1792bd292a7b5f492dcf3ad2bddf93e8b6675"},{"file":"module-RKK46F5E.js","sha256":"d6a66ca98e15c80745de3937674f481b5ff29ca523a3bd9cbd72b900aceabede"},{"file":"pwa-style.css","sha256":"a56db85e0eae3b28e166275f6152e92e5d51aaefd185059731c2d8b137d9431f"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
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
