import { handlePlatform, type Env } from '../../server/platform';
export async function onRequest(context: {request:Request; env:Env; waitUntil(promise:Promise<unknown>):void}) {
  return handlePlatform(context.request,context.env,{cache:(caches as CacheStorage & {default:Cache}).default,waitUntil:p=>context.waitUntil(p)});
}
