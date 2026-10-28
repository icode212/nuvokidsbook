import { z } from 'zod';
import type { Book } from '../content/schema';
import { database } from './storage';
const assetSchema = z.object({ url: z.string().startsWith('/').refine(s => !s.startsWith('//') && !s.includes('..')), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const inventorySchema = z.object({ bookId: z.string(), contentVersion: z.string(), assets: z.array(assetSchema).min(1) });
export interface DownloadRecord { key: string; version: string; bytes: number; urls: string[]; book: Book; completedAt: string }
export const downloadRecord = async (id: string): Promise<DownloadRecord | undefined> => (await database()).get('downloads', id);
const mediaKey = (id: string, version: string, url: string) => `${id}@${version}:${url}`;
export async function savedMedia(id: string, url: string): Promise<Blob | undefined> {
  const record = await downloadRecord(id);
  return record ? (await database()).get('media', mediaKey(id, record.version, url)) : undefined;
}
export async function downloadBook(book: Book, signal: AbortSignal, progress: (done: number, total: number) => void) {
  if (!book.inventory) throw new Error('This book does not have a download pack yet.');
  if (!('serviceWorker' in navigator) || !(await navigator.serviceWorker.getRegistration())?.active) throw new Error('Offline saving is available in the installed build or production preview. Reload once and try again.');
  const response = await fetch(book.inventory, { signal });
  if (!response.ok) throw new Error('The book’s download list could not be loaded.');
  const inventory = inventorySchema.parse(await response.json());
  if (inventory.bookId !== book.id || inventory.contentVersion !== book.contentVersion) throw new Error('The download version does not match this book.');
  const required = new Set([book.cover, ...Object.values(book.narrationAssets ?? {}), ...book.scenes.flatMap(s => [s.image, ...s.objects.flatMap(o => [...(o.image ? [o.image] : []), ...(o.soundFile ? [o.soundFile] : [])])])]);
  if ([...required].some(url => !inventory.assets.some(a => a.url === url))) throw new Error('The download pack is missing a required asset.');
  const total = inventory.assets.reduce((n, a) => n + a.bytes, 0);
  const db = await database(); let done = 0; progress(0, total);
  // Two bounded workers, verified reusable chunks, atomic ready pointer. Old complete versions survive failures.
  const pending = [...inventory.assets];
  async function worker() {
    while (pending.length) {
      signal.throwIfAborted(); const asset = pending.shift()!;
      const key = mediaKey(book.id, book.contentVersion, asset.url);
      let blob: Blob | undefined = await db.get('media', key);
      if (!blob) {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            signal.throwIfAborted(); const result = await fetch(asset.url, { signal, cache: 'no-store' });
            if (!result.ok) throw new Error('An asset could not be downloaded.');
            blob = await result.blob(); const data = await blob.arrayBuffer();
            const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(n => n.toString(16).padStart(2, '0')).join('');
            if (blob.size !== asset.bytes || digest !== asset.sha256) throw new Error('An asset failed its integrity check.');
            await db.put('media', blob, key); lastError = undefined; break;
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
  signal.throwIfAborted();
  const record: DownloadRecord = { key: book.id, version: book.contentVersion, bytes: total, urls: inventory.assets.map(a => a.url), book, completedAt: new Date().toISOString() };
  await db.put('downloads', record);
  return record;
}
export async function removeDownload(id: string) {
  const db = await database(); const tx = db.transaction(['downloads', 'media'], 'readwrite');
  const keys = await tx.objectStore('media').getAllKeys();
  for (const key of keys) if (String(key).startsWith(`${id}@`)) await tx.objectStore('media').delete(key);
  await tx.objectStore('downloads').delete(id); await tx.done;
}
export async function downloadedBooks(): Promise<DownloadRecord[]> { return (await database()).getAll('downloads'); }
export const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
