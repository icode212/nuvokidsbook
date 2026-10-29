import { z } from 'zod';
import { bookSchema, type Book } from '../content/schema';
import { database } from './storage';
import { mediaURL } from './platform';
import { sessionOwner, sessionEpoch, trackTransfer } from './session';
const assetSchema = z.object({ url: z.string().startsWith('/').refine(s => !s.startsWith('//') && !s.includes('..')), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const inventorySchema = z.object({ bookId: z.string(), contentVersion: z.string(), assets: z.array(assetSchema).min(1) });
export interface DownloadRecord { key: string; version: string; bytes: number; urls: string[]; book: Book; completedAt: string; ownerId?: string; preview?: boolean }
export const downloadRecord = async (id: string): Promise<DownloadRecord | undefined> => {
  const db = await database(); const free = await db.get('downloads',id) as DownloadRecord | undefined;
  if (free?.book.access === 'free') return free;
  const owner=sessionOwner(),epoch=sessionEpoch();
  const record = owner ? await db.get('downloads',`owner:${owner}:${id}`) as DownloadRecord|undefined : undefined;
  return owner===sessionOwner() && epoch===sessionEpoch() ? record : undefined;
};
const mediaKey = (id: string, version: string, url: string) => `${id}@${version}:${url}`;
export async function savedMedia(id: string, url: string): Promise<Blob | undefined> {
  const record = await downloadRecord(id);
  if (!record) return;
  const epoch=sessionEpoch(); const blob=await (await database()).get('media', mediaKey(record.key, record.version, url));
  return record.book.access==='free' || (epoch===sessionEpoch() && record.ownerId===sessionOwner()) ? blob : undefined;
}
interface Authorization {inventory:unknown;grant:string;owner:string;preview?:boolean}
export async function downloadAdminPreviewBook(book:Book,signal:AbortSignal,progress:(done:number,total:number)=>void) {
  const owner=sessionOwner(),epoch=sessionEpoch();
  if (!owner) throw new Error('Sign in as a platform admin to preview this book.');
  const {cloudClient}=await import('./catalogue');const cloud=await cloudClient();
  const {data:{session}}=await cloud.auth.getSession();
  if (!session || session.user.id!==owner) throw new Error('Sign in again to preview this book.');
  const response=await fetch(`/api/books/${encodeURIComponent(book.id)}/preview`,{method:'POST',signal,headers:{Authorization:`Bearer ${session.access_token}`}});
  const result=await response.json();if(!response.ok)throw new Error(result.error??'Preview unavailable.');
  if(owner!==sessionOwner() || epoch!==sessionEpoch())throw new DOMException('Account changed','AbortError');
  const saved=bookSchema.parse(result.book);
  if(saved.id!==book.id || saved.contentVersion!==book.contentVersion)throw new Error('Save this book version before previewing its private media.');
  return downloadBook(book,signal,progress,{inventory:result.inventory,grant:result.grant,owner,preview:true});
}
export async function downloadOwnedBook(id: string, signal: AbortSignal, progress: (done:number,total:number)=>void) {
  const owner = sessionOwner(), epoch = sessionEpoch();
  if (!owner) throw new Error('Sign in to restore this book.');
  const { cloudClient } = await import('./catalogue'); const cloud = await cloudClient();
  const {data:{session}} = await cloud.auth.getSession();
  if (!session || session.user.id !== owner) throw new Error('Sign in again to restore this book.');
  const response = await fetch(`/api/books/${encodeURIComponent(id)}/download`,{method:'POST',signal,headers:{Authorization:`Bearer ${session.access_token}`}});
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Book download unavailable.');
  if (owner !== sessionOwner() || epoch !== sessionEpoch()) throw new DOMException('Account changed','AbortError');
  const book = bookSchema.parse(result.book);
  if (book.id !== id || book.access !== 'paid') throw new Error('Invalid owned book response');
  return downloadBook(book,signal,progress,{inventory:result.inventory,grant:result.grant,owner});
}
export async function downloadBook(book: Book, originalSignal: AbortSignal, progress: (done: number, total: number) => void, authorization?: Authorization) {
  const paid = book.access === 'paid', owner = sessionOwner(), epoch = sessionEpoch();
  if (paid && (!authorization || !owner || authorization.owner !== owner)) throw new Error('Book ownership must be verified before downloading.');
  const controller = new AbortController(); const cancel = () => controller.abort(); originalSignal.addEventListener('abort',cancel,{once:true});
  if (originalSignal.aborted) controller.abort();
  const untrack = trackTransfer(controller); const signal = controller.signal;
  const assertCurrent = () => { signal.throwIfAborted(); if (paid && (sessionOwner() !== owner || sessionEpoch() !== epoch)) throw new DOMException('Account changed','AbortError'); };
  const recordKey = paid ? `owner:${owner}:${authorization?.preview ? 'preview:' : ''}${book.id}` : book.id;
  try {
  if (!book.inventory) throw new Error('This book does not have a download pack yet.');
  if (!('serviceWorker' in navigator) || !(await navigator.serviceWorker.getRegistration())?.active) throw new Error('Offline saving is available in the installed build or production preview. Reload once and try again.');
  let rawInventory = authorization?.inventory;
  if (!rawInventory) { const response = await fetch(mediaURL(book.inventory), { signal }); if (!response.ok) throw new Error('The book’s download list could not be loaded.'); rawInventory = await response.json(); }
  const inventory = inventorySchema.parse(rawInventory);
  assertCurrent();
  if (inventory.bookId !== book.id || inventory.contentVersion !== book.contentVersion) throw new Error('The download version does not match this book.');
  const required = new Set([book.cover, ...Object.values(book.narrationAssets ?? {}), ...book.scenes.flatMap(s => [s.image, ...s.objects.flatMap(o => [...(o.image ? [o.image] : []), ...(o.soundFile ? [o.soundFile] : [])])])]);
  if ([...required].some(url => !inventory.assets.some(a => a.url === url))) throw new Error('The download pack is missing a required asset.');
  const total = inventory.assets.reduce((n, a) => n + a.bytes, 0);
  const db = await database(); let done = 0; progress(0, total);
  // Two bounded workers, verified reusable chunks, atomic ready pointer. Old complete versions survive failures.
  const pending = [...inventory.assets];
  async function worker() {
    while (pending.length) {
      assertCurrent(); const asset = pending.shift()!;
      const key = mediaKey(recordKey, book.contentVersion, asset.url);
      let blob: Blob | undefined = await db.get('media', key);
      if (blob) {
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
        if (blob.size !== asset.bytes || digest !== asset.sha256) { await db.delete('media',key); blob = undefined; }
      }
      if (!blob) {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            assertCurrent(); const result = await fetch(mediaURL(asset.url), { signal, ...(asset.url.startsWith('/private/') ? {headers:{Authorization:`Bearer ${authorization!.grant}`}} : {}) });
            if (!result.ok) throw new Error('An asset could not be downloaded.');
            blob = await result.blob(); const data = await blob.arrayBuffer();
            const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(n => n.toString(16).padStart(2, '0')).join('');
            if (blob.size !== asset.bytes || digest !== asset.sha256) throw new Error('An asset failed its integrity check.');
            assertCurrent(); await db.put('media', blob, key); lastError = undefined; break;
          } catch (error) { lastError = error; if (signal.aborted || (error instanceof DOMException && error.name === 'QuotaExceededError')) throw error; }
        }
        if (lastError) throw lastError;
      }
      done += asset.bytes; progress(done, total);
    }
  }
  const results = await Promise.allSettled([worker(), worker()]);
  const failure = results.find(r => r.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  assertCurrent();
  const record: DownloadRecord = { key: recordKey, version: book.contentVersion, bytes: total, urls: inventory.assets.map(a => a.url), book, completedAt: new Date().toISOString(), ...(paid ? {ownerId:owner!} : {}), ...(authorization?.preview ? {preview:true} : {}) };
  await db.put('downloads', record);
  return record;
  } finally { untrack(); originalSignal.removeEventListener('abort',cancel); }
}
export async function removeDownload(id: string) {
  const record = await downloadRecord(id); const recordKey = record?.key ?? id;
  const db = await database(); const tx = db.transaction(['downloads', 'media'], 'readwrite');
  const keys = await tx.objectStore('media').getAllKeys();
  for (const key of keys) if (String(key).startsWith(`${recordKey}@`)) await tx.objectStore('media').delete(key);
  await tx.objectStore('downloads').delete(recordKey); await tx.done;
}
export async function downloadedBooks(): Promise<DownloadRecord[]> { const all = await (await database()).getAll('downloads') as DownloadRecord[]; return all.filter(record=>!record.preview && (record.book.access === 'free' || (record.ownerId && record.ownerId === sessionOwner()))); }
export const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
