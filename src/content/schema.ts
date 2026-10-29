import { z } from 'zod';

export const rectSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).refine(r => r.x + r.width <= 1.001 && r.y + r.height <= 1.001, 'Hit area must stay inside the scene');
const mediaPath = z.string().refine(p => p.startsWith('/') && !p.startsWith('//') && !p.includes('..'), 'Use a local absolute asset path');
export const objectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), label: z.string().min(1), transcript: z.string().min(1), rect: rectSchema,
  findPrompt: z.string().nullable(), sound: z.string().nullable(), productionMotion: z.string(),
  image: mediaPath.optional(), animation: z.enum(['wiggle', 'float', 'pulse']).default('pulse'),
  narrationAssetId: z.string(), soundAssetId: z.string().nullable(), findPromptAssetId: z.string().nullable(),
  soundFile: mediaPath.optional(),
});
export const sceneSchema = z.object({
  still: z.boolean().optional(),
  id: z.string(), pageNumber: z.number().int().positive(), title: z.string().min(1), storyText: z.string().min(1),
  storyNarrationAssetId: z.string(), image: mediaPath, aspectRatio: z.number().positive(),
  renderMode: z.enum(['static', 'layered']), objects: z.array(objectSchema).min(1),
});
export const bookSchema = z.object({
  readingMode: z.enum(['standard', 'bedtime']).optional(),
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z0-9-]+$/), contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1).max(100), series: z.string().max(100), creator: z.string().max(100),
  summary: z.string().min(1).max(500), locale: z.string(), ageRange: z.string(),
  openingPrompt: z.string().min(1).max(200).optional(), endingText: z.string().min(1).max(300).optional(),
  kind: z.enum(['story', 'discovery']), access: z.enum(['free', 'paid']), status: z.enum(['draft', 'published', 'archived']),
  sortOrder: z.number().int(), cover: mediaPath, inventory: mediaPath.optional(),
  assetStatus: z.enum(['development', 'reviewed']), scenes: z.array(sceneSchema),
  narrationAssets: z.record(z.string(), mediaPath).optional(),
}).superRefine((b, ctx) => {
  if (b.status === 'published' && !b.scenes.length) ctx.addIssue({ code: 'custom', message: 'Add at least one scene before publishing', path: ['scenes'] });
  const ids = new Set<string>();
  b.scenes.forEach((s, index) => {
    if (ids.has(s.id)) ctx.addIssue({ code: 'custom', message: `Duplicate scene: ${s.id}`, path: ['scenes', index] });
    ids.add(s.id);
    if (s.pageNumber !== index + 1) ctx.addIssue({ code: 'custom', message: 'Pages must be ordered from 1', path: ['scenes', index, 'pageNumber'] });
    if (new Set(s.objects.map(o => o.id)).size !== s.objects.length) ctx.addIssue({ code: 'custom', message: 'Duplicate object IDs', path: ['scenes', index, 'objects'] });
    if (s.renderMode === 'layered' && s.objects.some(o => !o.image)) ctx.addIssue({ code: 'custom', message: 'Layered scenes require separate object images', path: ['scenes', index] });
  });
});
export type Book = z.infer<typeof bookSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Target = z.infer<typeof objectSchema>;
export type BookSummary = Omit<Book, 'scenes'> & { sceneCount: number; owned?: boolean };
export const summarize = ({ scenes, ...book }: Book): BookSummary => ({ ...book, sceneCount: scenes.length });
export function visibleBooks(books: BookSummary[], hideUnowned = true) {
  return books.filter(b => b.status === 'published' && (b.access === 'free' || b.owned || !hideUnowned)).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}
