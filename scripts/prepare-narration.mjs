import { createServer } from 'vite';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Same local preview voice and speaking rate as NewNuvoKids. No network TTS service.
const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { farmBook } = await vite.ssrLoadModule('/content-source/a-day-at-the-farm/book.ts');
  const cues = new Map();
  for (const scene of farmBook.scenes) {
    cues.set(scene.storyText, scene.storyNarrationAssetId);
    for (const target of scene.objects) {
      cues.set(target.transcript, target.narrationAssetId);
      if (target.findPrompt) cues.set(target.findPrompt, target.findPromptAssetId);
    }
  }
  for (const [text, id] of [['You found it!', 'shared-found'], ['There it is!', 'shared-there'], ['Let’s look again.', 'shared-hint']]) cues.set(text, id);
  const base = `/books/${farmBook.id}/${farmBook.contentVersion}`;
  mkdirSync(`public${base}/audio`, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), 'nuvo-book-voice-'));
  const map = {};
  const inventory = JSON.parse(readFileSync('public/books/a-day-at-the-farm/0.1.0/inventory.json', 'utf8'));
  inventory.contentVersion = farmBook.contentVersion;
  try {
    for (const [text, id] of cues) {
      const url = `${base}/audio/${id}.wav`;
      execFileSync('/usr/bin/say', ['-v', 'Samantha', '-r', '145', '-o', join(temporary, 'voice.aiff'), text]);
      execFileSync('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', join(temporary, 'voice.aiff'), `public${url}`]);
      const bytes = readFileSync(`public${url}`);
      inventory.assets.push({ url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      map[text] = url;
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  writeFileSync('content-source/a-day-at-the-farm/narration.json', JSON.stringify(map, null, 2) + '\n');
  writeFileSync(`public${base}/inventory.json`, JSON.stringify(inventory, null, 2) + '\n');
  console.log(`Prepared ${cues.size} Samantha clips; complete pack ${(inventory.assets.reduce((n,a)=>n+a.bytes,0)/1024/1024).toFixed(1)} MB.`);
} finally { await vite.close(); }
