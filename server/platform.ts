import { bookSchema } from '../src/content/schema';

interface R2Object { body: ReadableStream; httpEtag: string; httpMetadata?: {contentType?: string} }
interface Bucket { get(key: string): Promise<R2Object | null> }
export interface Env {
  PUBLIC_BOOKS: Bucket; PRIVATE_BOOKS: Bucket;
  SUPABASE_URL: string; SUPABASE_PUBLIC_KEY: string; DOWNLOAD_SIGNING_SECRET: string;
}
interface EdgeCache { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> }
interface Runtime { cache?: EdgeCache; waitUntil?(promise: Promise<unknown>): void; fetch?: typeof fetch; now?: () => number }
const encoder = new TextEncoder();
const json = (value: unknown, status = 200, cache = 'no-store') => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json', 'Cache-Control':cache, 'X-Content-Type-Options':'nosniff'}});
const validId = (id: string) => /^[a-z0-9-]{1,100}$/.test(id);
function keyPath(path: string) {
  if (!/^books\/[a-z0-9-]+\/\d+\.\d+\.\d+\/[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('Invalid asset path');
  return path;
}
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const unb64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
interface Grant { user: string; book: string; version: string; exp: number }
async function hmac(secret: string) { return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']); }
export async function signGrant(value: Grant, secret: string) {
  const payload = b64(encoder.encode(JSON.stringify(value)));
  return payload + '.' + b64(new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(secret),encoder.encode(payload))));
}
async function verifyGrant(token: string, secret: string, now: number): Promise<Grant | null> {
  try {
    if (!secret || token.length > 2048) return null;
    const parts = token.split('.'); if (parts.length !== 2) return null;
    if (!await crypto.subtle.verify('HMAC',await hmac(secret),unb64(parts[1]),encoder.encode(parts[0]))) return null;
    const grant = JSON.parse(new TextDecoder().decode(unb64(parts[0]))) as Grant;
    return validId(grant.book) && /^\d+\.\d+\.\d+$/.test(grant.version) && typeof grant.user === 'string' && Number.isFinite(grant.exp) && grant.exp > now && grant.exp <= now + 901 ? grant : null;
  } catch { return null; }
}
function bearer(request: Request) { return request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1] ?? ''; }
export async function handlePlatform(request: Request, env: Env, runtime: Runtime = {}): Promise<Response> {
  const fetcher = runtime.fetch ?? fetch;
  const now = () => Math.floor((runtime.now?.() ?? Date.now())/1000);
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api/, '');
  // No environment flag, caller payload or valid token can enable checkout.
  if (/^\/(checkout|payments|webhook)(\/|$)/.test(route)) return json({error:'Payments are disabled.'},403);
  if (request.method !== 'GET' && !(request.method === 'POST' && /^\/books\/[a-z0-9-]+\/download$/.test(route))) return json({error:'Method not allowed'},405);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLIC_KEY) return json({error:'Platform configuration required'},503);
  if (route === '/config') return json({supabaseUrl:env.SUPABASE_URL,publicKey:env.SUPABASE_PUBLIC_KEY,assetBase:'/api/assets/free',paymentsEnabled:false},200,'public, max-age=300');
  const rest = async (path: string, token = '') => {
    const response = await fetcher(env.SUPABASE_URL+'/rest/v1/'+path, {headers:{apikey:env.SUPABASE_PUBLIC_KEY, ...(token ? {Authorization:`Bearer ${token}`} : {})}});
    if (!response.ok) throw new Error('Library service unavailable');
    return response.json();
  };
  try {
    if (route === '/catalogue') {
      const key = new Request(url.origin+'/api/catalogue');
      const cached = await runtime.cache?.match(key); if (cached) return cached;
      const data = await rest('book_catalogue?select=summary');
      const response = json(data.map((row: {summary: unknown}) => row.summary),200,'public, max-age=300');
      if (runtime.cache) runtime.waitUntil?.(runtime.cache.put(key,response.clone()));
      return response;
    }
    if (route.startsWith('/assets/')) {
      const match = route.match(/^\/assets\/(free|paid)\/(.+)$/); if (!match) return json({error:'Not found'},404);
      const key = keyPath(decodeURIComponent(match[2])); const paid = match[1] === 'paid';
      if (paid) {
        // Authorization ALWAYS precedes cache lookup. A short-lived book grant
        // avoids querying Supabase for every image/audio file in this download.
        const grant = await verifyGrant(bearer(request),env.DOWNLOAD_SIGNING_SECRET,now());
        if (!grant || !key.startsWith(`books/${grant.book}/${grant.version}/`)) return json({error:'Download authorization required'},403);
      }
      const cacheKey = new Request(url.origin+`/api/assets/${paid ? 'paid' : 'free'}/${key}`);
      let response = await runtime.cache?.match(cacheKey);
      if (!response) {
        const object = await (paid ? env.PRIVATE_BOOKS : env.PUBLIC_BOOKS)?.get(key);
        if (!object) return json({error:'Asset not found'},404);
        response = new Response(object.body, {headers:{'Content-Type':object.httpMetadata?.contentType ?? 'application/octet-stream','ETag':object.httpEtag,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
        if (runtime.cache) runtime.waitUntil?.(runtime.cache.put(cacheKey,response.clone()));
      }
      if (!paid) return response;
      const headers = new Headers(response.headers); headers.set('Cache-Control','private, no-store');
      return new Response(response.body,{headers});
    }
    const match = route.match(/^\/books\/([a-z0-9-]+)\/download$/);
    if (match && request.method === 'POST') {
      if (!env.DOWNLOAD_SIGNING_SECRET || env.DOWNLOAD_SIGNING_SECRET.length < 32) return json({error:'Downloads are not configured'},503);
      const token = bearer(request); if (!token) return json({error:'Sign in to restore your books'},401);
      const userResponse = await fetcher(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLIC_KEY,Authorization:`Bearer ${token}`}});
      if (!userResponse.ok) return json({error:'Sign in again to download'},401);
      const user = await userResponse.json() as {id?: string}; if (!user.id) return json({error:'Sign in again'},401);
      const id = match[1];
      const entitlements = await rest(`book_entitlements?select=book_id&book_id=eq.${id}&status=eq.active&user_id=eq.${encodeURIComponent(user.id)}`,token);
      if (!entitlements.length) return json({error:'This book is not owned by this account'},403);
      const rows = await rest(`books?select=manifest&id=eq.${id}&status=eq.published&access=eq.paid`,token);
      if (!rows.length) return json({error:'Book unavailable'},404);
      const book = bookSchema.parse(rows[0].manifest);
      const prefix = `/private/books/${id}/${book.contentVersion}/`;
      if (book.id !== id || book.access !== 'paid' || book.inventory !== prefix+'inventory.json') return json({error:'Invalid protected book configuration'},503);
      const object = await env.PRIVATE_BOOKS.get(`books/${id}/${book.contentVersion}/inventory.json`);
      if (!object) return json({error:'Book download unavailable'},404);
      const inventory = await new Response(object.body).json() as {bookId:string;contentVersion:string;assets:{url:string}[]};
      const publicCover = new RegExp(`^/books/${id}/${book.contentVersion.replaceAll('.','\\.')}/cover\\.(webp|png|jpg)$`).test(book.cover);
      const privateMedia = book.scenes.flatMap(scene=>[scene.image,...scene.objects.flatMap(object=>[object.image,object.soundFile].filter((p):p is string=>Boolean(p)))]).concat(Object.values(book.narrationAssets ?? {}));
      if (!publicCover || privateMedia.some(path=>!path.startsWith(prefix)) || inventory.bookId !== id || inventory.contentVersion !== book.contentVersion || !inventory.assets.length || inventory.assets.some(a => !a.url.startsWith(prefix) && a.url !== book.cover)) return json({error:'Invalid protected inventory'},503);
      const grant = await signGrant({user:user.id,book:id,version:book.contentVersion,exp:now()+900},env.DOWNLOAD_SIGNING_SECRET);
      return json({book,inventory,grant});
    }
    return json({error:'Not found'},404);
  } catch { return json({error:'The book service is temporarily unavailable'},503); }
}
