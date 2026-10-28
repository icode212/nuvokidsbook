import { bookSchema, summarize, type Book, type BookSummary } from '../content/schema';
import { farmBook } from '../../content-source/a-day-at-the-farm/book';
import { localBooks, saveLocalBook } from './storage';
import { downloadedBooks } from './downloads';
import type { SupabaseClient } from '@supabase/supabase-js';
import { initializePlatform, platform } from './platform';
import { setSessionOwner, sessionOwner, sessionEpoch } from './session';
import { database } from './storage';

export let cloudConfigured = Boolean(platform.supabaseUrl || platform.publicKey);
export async function initializeAccount() {
  await initializePlatform(); cloudConfigured = Boolean(platform.supabaseUrl || platform.publicKey);
  if (!cloudConfigured) return;
  if (!navigator.onLine) return; // Persisted identity only scopes local files offline.
  const cloud = await cloudClient();
  const {data:{session}} = await cloud.auth.getSession(); setSessionOwner(session?.user.id ?? null);
}
export async function cloudClient() {
  await initializePlatform(); const url = platform.supabaseUrl, key = platform.publicKey;
  cloudConfigured = Boolean(url || key);
  if (!url || !key) throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the platform.');
  const { createClient } = await import('@supabase/supabase-js');
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    client.auth.onAuthStateChange((_event,session) => setSessionOwner(session?.user.id ?? null));
  }
  return client;
}
let client: SupabaseClient | undefined;
export async function listBooks(admin = false): Promise<Book[]> {
  await initializeAccount();
  if (cloudConfigured) {
    if (!navigator.onLine && !admin) return (await downloadedBooks()).map(d => d.book);
    const cloud = await cloudClient();
    let query = cloud.from('books').select('manifest');
    if (!admin) query = query.eq('status', 'published').eq('access', 'free');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(row => bookSchema.parse(row.manifest));
  }
  const overrides = await localBooks();
  return [farmBook, ...overrides.filter(b => b.id !== farmBook.id)].map(b => overrides.find(o => o.id === b.id) ?? b);
}
export async function listSummaries(): Promise<BookSummary[]> { return (await listBooks()).map(summarize); }
export async function saveBook(book: Book) {
  const valid = bookSchema.parse(book);
  if (!cloudConfigured && valid.status === 'published' && valid.access !== 'free') throw new Error('Paid publishing requires the connected platform. Save this book as a draft.');
  if (cloudConfigured) {
    const cloud = await cloudClient();
    const { error } = await cloud.from('books').upsert({ id: valid.id, title: valid.title, series: valid.series, status: valid.status, access: valid.access, sort_order: valid.sortOrder, manifest: valid });
    if (error) throw new Error(error.message);
  } else await saveLocalBook(valid);
}
export async function isPlatformAdmin(): Promise<boolean> {
  await initializeAccount();
  if (!cloudConfigured) return true;
  const cloud = await cloudClient(); const { data: { user } } = await cloud.auth.getUser();
  if (!user) return false;
  const { data, error } = await cloud.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
export async function listCatalogue(force = false): Promise<BookSummary[]> {
  await initializeAccount();
  const accountEpoch = sessionEpoch();
  if (!cloudConfigured) return (await listBooks()).map(summarize);
  const db = await database();
  const cached = await db.get('settings','catalogue') as {books:BookSummary[];at:number} | undefined;
  let books = cached?.books;
  if (navigator.onLine && (force || !cached || Date.now()-cached.at > 15*60*1000)) {
    const response = await fetch('/api/catalogue');
    if (!response.ok) throw new Error('The bookshelf could not be loaded.');
    books = await response.json();
    await db.put('settings',{books,at:Date.now()},'catalogue');
  }
  if (!books) books = (await downloadedBooks()).map(record=>summarize(record.book));
  let owned = new Set<string>();
  const owner = sessionOwner();
  if (owner) {
    const previous = await db.get('settings',`owned:${owner}`) as string[] | undefined;
    owned = new Set(previous ?? []);
    if (navigator.onLine && (force || !previous)) {
      const cloud = await cloudClient(); const {data,error} = await cloud.from('book_entitlements').select('book_id').eq('status','active');
      if (error) throw error;
      if (accountEpoch !== sessionEpoch()) return listCatalogue(force);
      owned = new Set(data.map(row=>row.book_id as string)); await db.put('settings',[...owned],`owned:${owner}`);
    }
  }
  const saved = await downloadedBooks();
  if (accountEpoch !== sessionEpoch()) return listCatalogue(force);
  return books.map(book=>({...book,owned:book.access==='free' || owned.has(book.id) || saved.some(d=>d.book.id===book.id && d.book.access==='paid')}));
}
export async function loadBook(id: string, version?: string): Promise<Book> {
  if (!cloudConfigured) { const book = (await listBooks()).find(b=>b.id===id); if (!book) throw new Error('Book unavailable'); return book; }
  const db = await database(); const cached = await db.get('settings',`free-manifest:${id}`) as {book:Book;at:number}|undefined;
  if (cached && (!version || cached.book.contentVersion === version) && Date.now()-cached.at < 15*60*1000) return bookSchema.parse(cached.book);
  const cloud = await cloudClient(); const {data,error} = await cloud.from('books').select('manifest').eq('id',id).eq('status','published').eq('access','free').single();
  if (error) throw new Error('This book is unavailable for this account.');
  const book = bookSchema.parse(data.manifest); await db.put('settings',{book,at:Date.now()},`free-manifest:${id}`); return book;
}
