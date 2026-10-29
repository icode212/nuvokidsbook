import {expect,it,vi} from 'vitest';
import {handlePlatform,signGrant,type Env} from './platform';
import {farmBook} from '../content-source/a-day-at-the-farm/book';
const env:Env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLIC_KEY:'public-key',DOWNLOAD_SIGNING_SECRET:'a-very-long-test-signing-secret-123456789',PUBLIC_BOOKS:{get:vi.fn(async()=>null)},PRIVATE_BOOKS:{get:vi.fn(async()=>null)}};
it('hard disables checkout and webhooks even with missing configuration',async()=>{
  for(const path of ['checkout','payments','webhook'])expect((await handlePlatform(new Request(`https://books.test/api/${path}`,{method:'POST'}),{} as Env)).status).toBe(403);
});
it('never checks private edge cache before authorizing a grant',async()=>{
  const cache={match:vi.fn(async()=>new Response('private')),put:vi.fn()};
  const url='https://books.test/api/assets/paid/books/paid-book/1.0.0/story.m4a';
  expect((await handlePlatform(new Request(url),env,{cache})).status).toBe(403);
  expect((await handlePlatform(new Request(url,{headers:{Authorization:'Bearer forged.token'}}),env,{cache})).status).toBe(403);
  expect(cache.match).not.toHaveBeenCalled();
});
it('binds short-lived download grants to a specific book and version',async()=>{
  const now=1000000, cache={match:vi.fn(async()=>new Response('private')),put:vi.fn()};
  const token=await signGrant({user:'owner',book:'paid-book',version:'1.0.0',exp:now+900},env.DOWNLOAD_SIGNING_SECRET);
  const request=(path:string)=>new Request('https://books.test/api/assets/paid/books/'+path,{headers:{Authorization:`Bearer ${token}`}});
  const response=await handlePlatform(request('paid-book/1.0.0/story.m4a'),env,{cache,now:()=>now*1000});
  expect(await response.text()).toBe('private');expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect((await handlePlatform(request('other-book/1.0.0/story.m4a'),env,{cache,now:()=>now*1000})).status).toBe(403);
  expect((await handlePlatform(request('paid-book/2.0.0/story.m4a'),env,{cache,now:()=>now*1000})).status).toBe(403);
  expect((await handlePlatform(request('paid-book/1.0.0/story.m4a'),env,{cache,now:()=>(now+901)*1000})).status).toBe(403);
  expect(cache.match).toHaveBeenCalledTimes(1);
});
it('requires server-confirmed identity and ownership before issuing download access',async()=>{
  const request=new Request('https://books.test/api/books/paid-book/download',{method:'POST',headers:{Authorization:'Bearer parent-session'}});
  const fetcher=vi.fn(async(url:RequestInfo|URL)=>String(url).includes('/auth/v1/user')?new Response(JSON.stringify({id:'parent'})):new Response('[]'));
  expect((await handlePlatform(request,env,{fetch:fetcher as typeof fetch})).status).toBe(403);
  const unauthorized=vi.fn(async()=>new Response('{}',{status:401}));
  expect((await handlePlatform(request,env,{fetch:unauthorized as typeof fetch})).status).toBe(401);
});
it('serves cached free files without an authentication or database request',async()=>{
  const fetcher=vi.fn(),cache={match:vi.fn(async()=>new Response('free')),put:vi.fn()};
  expect(await (await handlePlatform(new Request('https://books.test/api/assets/free/books/farm/1.0.0/cover.webp'),env,{cache,fetch:fetcher})).text()).toBe('free');
  expect(fetcher).not.toHaveBeenCalled();
});
it('issues a download grant only for an owned published paid book with private media',async()=>{
  const prefix='/private/books/paid-book/1.0.0/';
  const book={...structuredClone(farmBook),id:'paid-book',contentVersion:'1.0.0',access:'paid',cover:'/books/paid-book/1.0.0/cover.webp',inventory:prefix+'inventory.json',narrationAssets:undefined,scenes:[{...farmBook.scenes[0],image:prefix+'page.webp',objects:farmBook.scenes[0].objects.map(o=>({...o,soundFile:undefined}))}]};
  const inventory={bookId:book.id,contentVersion:book.contentVersion,assets:[{url:book.cover},{url:prefix+'page.webp'}]};
  const configured={...env,PRIVATE_BOOKS:{get:vi.fn(async()=>({body:new Response(JSON.stringify(inventory)).body!,httpEtag:'etag'}))}};
  const fetcher=vi.fn(async(input:RequestInfo|URL)=>new Response(JSON.stringify(String(input).includes('/auth/v1/user')?{id:'parent'}:String(input).includes('book_entitlements')?[{book_id:'paid-book'}]:[{manifest:book}])));
  const response=await handlePlatform(new Request('https://books.test/api/books/paid-book/download',{method:'POST',headers:{Authorization:'Bearer verified-session'}}),configured,{fetch:fetcher as typeof fetch});
  expect(response.status).toBe(200);const data=await response.json() as {grant:string};expect(data.grant.split('.')).toHaveLength(2);expect(response.headers.get('cache-control')).toBe('no-store');
});
it('allows an admin to preview a draft without granting ownership, and rejects ordinary parents',async()=>{
  const prefix='/private/books/paid-draft/1.0.0/';
  const book={...structuredClone(farmBook),id:'paid-draft',contentVersion:'1.0.0',status:'draft',access:'paid',cover:'/books/paid-draft/1.0.0/cover.webp',inventory:prefix+'inventory.json',narrationAssets:undefined,scenes:[{...farmBook.scenes[0],image:prefix+'page.webp',objects:farmBook.scenes[0].objects.map(o=>({...o,soundFile:undefined}))}]};
  const inventory={bookId:book.id,contentVersion:book.contentVersion,assets:[{url:book.cover},{url:prefix+'page.webp'}]};
  const configured={...env,PRIVATE_BOOKS:{get:vi.fn(async()=>({body:new Response(JSON.stringify(inventory)).body!,httpEtag:'etag'}))}};
  let isAdmin=false;
  const fetcher=vi.fn(async(input:RequestInfo|URL)=>new Response(JSON.stringify(String(input).includes('/auth/v1/user')?{id:'admin'}:String(input).includes('platform_admins')?(isAdmin?[{user_id:'admin'}]:[]):[{manifest:book}])));
  const request=()=>new Request('https://books.test/api/books/paid-draft/preview',{method:'POST',headers:{Authorization:'Bearer verified-session'}});
  expect((await handlePlatform(request(),configured,{fetch:fetcher as typeof fetch})).status).toBe(403);
  expect(configured.PRIVATE_BOOKS.get).not.toHaveBeenCalled();
  isAdmin=true;const response=await handlePlatform(request(),configured,{fetch:fetcher as typeof fetch});
  expect(response.status).toBe(200);expect((await response.json() as {book:{status:string}}).book.status).toBe('draft');
  expect(fetcher.mock.calls.every(([input])=>!String(input).includes('book_entitlements'))).toBe(true);
  expect(fetcher.mock.calls.every(([,options])=>!options || !('method' in options))).toBe(true);
});
