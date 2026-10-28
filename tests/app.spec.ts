import { test, expect } from '@playwright/test';
test.beforeEach(async ({page}) => { page.on('pageerror', error => console.log('Browser error:', error.message)); });
async function parents(page: import('@playwright/test').Page) {
  await page.getByRole('button',{name:'Grown-ups',exact:true}).click();
  await page.getByLabel('Type grown up',{exact:true}).fill('grown up');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
}
test('anonymous story, all pages, explore, find it and small-screen geometry', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/');
  await expect(page.getByRole('heading',{name:'Your little bookshelf'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Let’s explore',exact:true}).click();
  await page.getByRole('button',{name:'Open the book',exact:true}).click();
  await expect(page.getByRole('button',{name:'Birds',exact:true})).toBeVisible();
  await page.setViewportSize({width:820,height:1180});
  expect(await page.locator('.scene-canvas').evaluate(el=>Math.abs(el.getBoundingClientRect().width / el.getBoundingClientRect().height - 1.5))).toBeLessThan(.01);
  await page.setViewportSize({width:390,height:844});
  const spokenRequests: string[] = [];
  page.on('request', r => { if(r.url().includes('/audio/')) spokenRequests.push(r.url()); });
  const birdCall = page.waitForResponse(r => r.url().endsWith('/effects/birds.wav'));
  await page.getByRole('button',{name:'Birds',exact:true}).click();
  expect((await birdCall).ok()).toBe(true);
  expect(spokenRequests).toHaveLength(0);
  await expect(page.locator('.object-label')).toHaveText('Birds');
  await page.getByRole('button',{name:'Find it',exact:true}).click(); await expect(page.locator('.find-prompt')).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Pages',exact:true}).click();
  await page.getByRole('button',{name:'12. Goodbye for Now',exact:true}).click();
  await expect(page.getByRole('button',{name:'Farmer',exact:true})).toBeVisible();
  await page.locator('.reader-navigation').getByRole('button',{name:'Bookshelf',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your little bookshelf'})).toBeVisible();
});
test('parent gate, persistent settings, book download and offline reopen', async ({ page, context }) => {
  await page.addInitScript(() => {
    const qa = window as Window & { recordedVoiceStarts?: number; browserVoiceStarts?: number };
    qa.recordedVoiceStarts = 0; qa.browserVoiceStarts = 0;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() {
      const source = create.call(this); const start = source.start.bind(source);
      source.start = (...args: Parameters<typeof start>) => { qa.recordedVoiceStarts!++; start(...args); }; return source;
    };
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utterance => { qa.browserVoiceStarts!++; speak(utterance); };
  });
  await page.goto('/'); await page.evaluate(async()=>{await navigator.serviceWorker.ready;}); await page.reload();
  await parents(page); await page.getByLabel('Word labels',{exact:false}).uncheck();
  await page.getByRole('button',{name:'Save book offline',exact:true}).click();
  await expect(page.getByText(/Saved ·/)).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await context.setOffline(true); await page.reload();
  await expect(page.getByText('You’re offline. Saved stories are still here.')).toBeVisible();
  await page.getByRole('button',{name:'Let’s explore',exact:true}).click(); await page.getByRole('button',{name:'Open the book',exact:true}).click();
  await expect(page.getByRole('button',{name:'Birds',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Read the story',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as Window & {recordedVoiceStarts?:number}).recordedVoiceStarts)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as Window & {browserVoiceStarts?:number}).browserVoiceStarts)).toBe(0);
  const beforeCall = await page.evaluate(() => (window as Window & {recordedVoiceStarts?:number}).recordedVoiceStarts ?? 0);
  await page.getByRole('button',{name:'Birds',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as Window & {recordedVoiceStarts?:number}).recordedVoiceStarts ?? 0)).toBeGreaterThan(beforeCall);
  await expect(page.locator('.object-label')).toHaveCount(0);
  await page.getByRole('button',{name:'Pages',exact:true}).click(); await page.getByRole('button',{name:'11. A Happy Farm',exact:true}).click();
  await expect(page.getByRole('button',{name:'Grazing sheep',exact:true})).toBeVisible();
  await context.setOffline(false);
});
test('studio adds a fifth book, publishes, persists and archives without deleting', async ({ page }) => {
  await page.goto('/'); await parents(page); await page.getByRole('button',{name:'Book Studio',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Book Studio.'})).toBeVisible();
  await page.getByRole('button',{name:'Add a book',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('The Fifth Adventure');
  await page.getByLabel('Book ID',{exact:false}).fill('fifth-adventure');
  await page.getByRole('button',{name:'NuvoKids Books, bookshelf',exact:true}).click();
  await expect(page.getByRole('alertdialog',{name:'Unsaved changes'})).toBeVisible();
  await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  await page.getByRole('button',{name:'Save book',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Book saved on this device.');
  // Draft can be saved before scenes are authored; publish requires valid scenes.
  await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('published');
  await page.getByRole('button',{name:'Save book',exact:true}).click(); await expect(page.getByRole('alert')).toContainText('Add at least one scene');
  const scenes = await import('../content-source/a-day-at-the-farm/book').then(m => m.farmBook.scenes);
  await page.getByLabel('Scene manifest JSON').fill(JSON.stringify(scenes));
  await page.getByRole('button',{name:'Save book',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('Book saved on this device.');
  await page.getByRole('button',{name:'All books',exact:true}).click(); await expect(page.locator('.studio-row')).toHaveCount(2);
  await page.getByRole('button',{name:/The Fifth Adventure Nuvo/}).click();
  await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('archived'); await page.getByRole('button',{name:'Save book',exact:true}).click();
  await page.reload(); await page.getByLabel('Type grown up',{exact:true}).fill('grown up'); await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('.studio-row')).toHaveCount(2); await expect(page.getByText('archived',{exact:true})).toBeVisible();
});
