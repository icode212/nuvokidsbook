import { describe, expect, it } from 'vitest';
import { farmBook } from '../../content-source/a-day-at-the-farm/book';
import { bookSchema, summarize, visibleBooks } from './schema';
import { findResponse, nextFindTarget } from '../features/reader/find-it';

describe('content contract', () => {
  it('has prepared voice files for every farm line and shared response', () => {
    const texts = farmBook.scenes.flatMap(s => [s.storyText, ...s.objects.flatMap(o => [o.transcript, ...(o.findPrompt ? [o.findPrompt] : [])])]);
    texts.push('You found it!', 'There it is!', 'Let’s look again.');
    expect(texts.every(text => farmBook.narrationAssets?.[text]?.startsWith('/books/a-day-at-the-farm/0.4.0/audio/') && farmBook.narrationAssets[text].endsWith('.m4a'))).toBe(true);
  });
  it('includes all 12 approved farm pages, with 3 explicit targets on each', () => {
    expect(bookSchema.safeParse(farmBook).success).toBe(true);
    expect(farmBook.scenes.map(s => s.pageNumber)).toEqual(Array.from({length:12}, (_, i) => i + 1));
    expect(farmBook.scenes.every(s => s.objects.length === 3 && s.objects.every(o => o.transcript && o.narrationAssetId))).toBe(true);
    const narrationIds = farmBook.scenes.flatMap(s => s.objects.map(o => o.narrationAssetId));
    expect(new Set(narrationIds).size).toBe(narrationIds.length);
  });
  it('rejects duplicate pages, unordered pages and out-of-scene hit areas', () => {
    const book = structuredClone(farmBook); book.scenes[1].id = book.scenes[0].id;
    expect(bookSchema.safeParse(book).success).toBe(false);
    book.scenes[1].id = 'unique'; book.scenes[1].pageNumber = 10;
    expect(bookSchema.safeParse(book).success).toBe(false);
    book.scenes[1].pageNumber = 2; book.scenes[0].objects[0].rect.width = .999;
    expect(bookSchema.safeParse(book).success).toBe(false);
  });
  it('allows metadata-only drafts, but requires content to publish', () => {
    expect(bookSchema.safeParse({...farmBook, status:'draft',scenes:[]}).success).toBe(true);
    expect(bookSchema.safeParse({...farmBook,scenes:[]}).success).toBe(false);
  });
  it('scales beyond four books and excludes drafts, archives and paid access', () => {
    const books = Array.from({length:20}, (_,i) => summarize({...farmBook,id:`book-${i}`,sortOrder:20-i}));
    expect(visibleBooks(books)).toHaveLength(20);
    expect(visibleBooks(books)[0].id).toBe('book-19');
    expect(visibleBooks([{...books[0], status:'draft'}, {...books[1],status:'archived'}, {...books[2],access:'paid'}])).toHaveLength(0);
  });
  it('excludes action-only prompts and avoids immediately repeating a target', () => {
    const scene = farmBook.scenes[8];
    expect(nextFindTarget(scene, 'chick', () => 0)?.id).toBe('hen');
    expect(nextFindTarget(scene, undefined, () => .999)?.id).not.toBe('pip-ears');
    expect(findResponse('hen','chick')).toEqual({correct:false,text:'Let’s look again.'});
    expect(findResponse('chick','chick').correct).toBe(true);
  });
});
