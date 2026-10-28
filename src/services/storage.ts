import { openDB } from 'idb';
import type { Book } from '../content/schema';

export interface Settings { narration: boolean; voiceVolume: number; sounds: boolean; motion: boolean; labels: boolean; hideUnowned: boolean }
export const defaultSettings: Settings = { narration: true, voiceVolume: .85, sounds: true, motion: true, labels: true, hideUnowned: true };
export const database = () => openDB('nuvokids-books', 1, { upgrade(db) {
  db.createObjectStore('settings'); db.createObjectStore('books', { keyPath: 'id' });
  db.createObjectStore('media'); db.createObjectStore('downloads', { keyPath: 'key' }); db.createObjectStore('progress');
}});
export async function readSettings(): Promise<Settings> { return { ...defaultSettings, ...await (await database()).get('settings', 'parent') }; }
export async function saveSettings(settings: Settings) { await (await database()).put('settings', settings, 'parent'); }
export async function localBooks(): Promise<Book[]> { return (await database()).getAll('books'); }
export async function saveLocalBook(book: Book) { await (await database()).put('books', book); }
export async function readProgress(bookId: string): Promise<number> { return (await (await database()).get('progress', bookId)) ?? 0; }
export async function saveProgress(bookId: string, page: number) { await (await database()).put('progress', page, bookId); }
