/* This public shell worker is completed by scripts/build.mjs. No business data belongs here. */
const RELEASE="4b76b9657d7022cd12dbea77";
const ASSETS=[{"file":"administration.js","sha256":"b86bfe68687b6bd577ff6ab9f349a40bfd369ff6991ba3e65bccd0cf9ef08010"},{"file":"apple-touch-icon.png","sha256":"3f670e5aa7b41970d71f66291c53faca136be855d2acf566137f89d7d8c5292e"},{"file":"application.js","sha256":"b5a9dda24129be6d7c1a4544857fadc5f35f2745e1a9f3c8e2ce3ddf7dda89af"},{"file":"daily-style.css","sha256":"5654b45c626a8a1fd5391ed57a04f10cfb15f6afbfc48d02305a69f9d7c4758f"},{"file":"icon-192.png","sha256":"3cd5de3a413b3aa441e82f86a46edf7c6611be6a07b80b554c3ac44c41065c77"},{"file":"icon-512.png","sha256":"07c077080042478d6cfee9e1366b01dc61228c7462492d16b97d5a222d77321d"},{"file":"icon-maskable-512.png","sha256":"4da68629181e8b7c4dd1222548108a37ae357d0c2f7aa3c8a365930c3f7a5d1a"},{"file":"icon.svg","sha256":"f4e0ffaadb2ad826906407cee82d747fef615b7b1b729e1ed6148d3c7d12a8c4"},{"file":"index.html","sha256":"092ca18d3ee8f447c04240282dd4f067a06cb84fed559ce974b085155756b37b"},{"file":"manifest.webmanifest","sha256":"a72b09ee85f762ff0e6d3f1291f44021658a322d1e1fd0956060a8e88b3986ea"},{"file":"master-style.css","sha256":"7026131d1d81d29365aac69e9f68ccaf8e2cd09ddf2e001444c0ace4e6588e73"},{"file":"master.html","sha256":"638f82cc40f93ad603cf12077f7b3250dea4f4ef1b66bda10adbcf1450ca2ea1"},{"file":"module-CEA67BML.js","sha256":"933b125e409f37e77bdb9d3bf6c2f75e3682b580feafa895da024a14df827cc7"},{"file":"module-E3RWF7FE.js","sha256":"8749df439b8fb104e3b4577711123ab6f5c5fa659c9a01d0286ce2c2d909196b"},{"file":"module-MI66YZH5.js","sha256":"1093b598cfc92599ac0ab96f2e77fcf3726644ca25ff8f1684a3b72365e01443"},{"file":"module-OWGQPIZ7.js","sha256":"a00879c1546006d5a655997a68190c7bc6d2a2803ea74fbd155001d1ff6f87b3"},{"file":"pwa-style.css","sha256":"a56db85e0eae3b28e166275f6152e92e5d51aaefd185059731c2d8b137d9431f"},{"file":"pwa.js","sha256":"81b6022c4e7007977a4b2b22905d20757715fa93e8ed87cfeb4953e98403acd2"}];
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
