import { bookSchema, summarize, type Book, type BookSummary } from '../content/schema';
import { farmBook } from '../../content-source/a-day-at-the-farm/book';
import { localBooks, saveLocalBook } from './storage';
import { downloadedBooks } from './downloads';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(url || key);
export async function cloudClient() {
  if (!url || !key) throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the platform.');
  const { createClient } = await import('@supabase/supabase-js');
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}
let client: SupabaseClient | undefined;
export async function listBooks(admin = false): Promise<Book[]> {
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
  if (valid.status === 'published' && valid.access !== 'free') throw new Error('Paid publishing requires the future entitlement service. Save this book as a draft.');
  if (cloudConfigured) {
    const cloud = await cloudClient();
    const { error } = await cloud.from('books').upsert({ id: valid.id, title: valid.title, series: valid.series, status: valid.status, access: valid.access, sort_order: valid.sortOrder, manifest: valid });
    if (error) throw new Error(error.message);
  } else await saveLocalBook(valid);
}
export async function isPlatformAdmin(): Promise<boolean> {
  if (!cloudConfigured) return true;
  const cloud = await cloudClient(); const { data: { user } } = await cloud.auth.getUser();
  if (!user) return false;
  const { data, error } = await cloud.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
