import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

it('matches immutable shell assets despite Vary: Origin on module requests', async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const shellResponse = new Response('offline javascript');
  const match = vi.fn(async (_request: unknown, options?: {ignoreVary?:boolean}) => options?.ignoreVary ? shellResponse.clone() : undefined);
  const scope = { location:{origin:'https://books.example'},addEventListener:(name:string,handler:(e:unknown)=>void)=>handlers.set(name,handler) };
  const code = readFileSync('src/services/sw-template.js','utf8').replace('__SHELL_VERSION__','test').replace('__SHELL_FILES__',JSON.stringify(['/index.html','/assets/app.js']));
  const offlineFetch = vi.fn(async()=>{throw new TypeError('offline');});
  new Function('self','caches','fetch',code)(scope,{open:async()=>({match})},offlineFetch);
  let response: Promise<Response> | undefined;
  handlers.get('fetch')!({request:{url:'https://books.example/assets/app.js',method:'GET'},respondWith:(r:Promise<Response>)=>{response=r;}});
  expect(await (await response)!.text()).toBe('offline javascript');
  expect(offlineFetch).not.toHaveBeenCalled();
  handlers.get('fetch')!({request:{url:'https://books.example/',method:'GET',mode:'navigate'},respondWith:(r:Promise<Response>)=>{response=r;}});
  expect(await (await response)!.text()).toBe('offline javascript');
});
