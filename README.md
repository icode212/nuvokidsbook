# NuvoKids Books

Latest audio update: animal taps now play seven real recorded farm calls immediately. Story narration remains Samantha. See [animal sound notes and credits](docs/ANIMAL_SOUNDS.md). Save the version 0.3.0 book update for offline calls.

A Vite + React + TypeScript PWA for ages 2–5. The first playable book is **Nuvo & the Wonder Crew: A Day at the Farm**, with a separate editable cover and all twelve story pages. No account or purchase is needed. The catalogue has no four-book limit.

## Run

```sh
npm install --legacy-peer-deps
npm run dev
```

For service-worker/offline testing use the production preview:

```sh
npm run build
npm run preview -- --port 4187 --strictPort
```

Open http://127.0.0.1:4187. Visit once online, reload after the service worker activates, then use **Grown-ups → Save book offline**. The farm book now uses prepared **Samantha narration**, matching NewNuvoKids, for all stories, object names and Find it prompts. Audio, pictures and text are verified before a download is marked complete. Existing downloads show **Save update** for version 0.2.0; old complete snapshots remain intact until the update succeeds.

## Manage books

Open **Grown-ups**, type **grown up**, then choose **Book Studio**. Direct route: `/#/admin` (the reading gate still appears). Without Supabase configuration, this is explicitly a **Local studio**: edits live in this browser’s IndexedDB and can be exported as JSON. It is useful for authoring and previewing, not shared platform administration.

Book Studio supports adding unlimited book records, editing metadata and scene JSON, previewing, publishing free books, archiving, sorting, searching, filtering, and manifest import/export. Drafts can be saved before scenes are written. Publish requires valid scenes. Stable IDs prevent accidental replacement. Archive preserves content. Images are delivered through the asset workflow rather than a public upload endpoint.

See [platform setup](docs/PLATFORM_SETUP.md) for protected shared admin accounts and deployment. Supabase migration/OTP integration is provided but requires configuration and hosted verification.

## Content and assets

- `content-source/a-day-at-the-farm/book.ts`: approved story lines, authored hit boxes, separate identification transcripts, Find it prompts, audio references and intended production motions.
- `src/content/schema.ts`: runtime schema shared by catalogue, reader and studio. Books are data, not separate React components.
- `scripts/prepare-assets.py`: generates compressed WebP delivery copies and size/SHA-256 inventory from the supplied masters. Requires Python Pillow. Originals remain unchanged.
- `public/books/a-day-at-the-farm/0.1.0/`: versioned delivery files, about 4.9 MB for all pictures.
- [Asset status](docs/ASSET_STATUS.md): exact limitations and outstanding production work.

## Verify

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests use installed macOS Chrome; change `executablePath` in `playwright.config.ts` for another environment. SQL role tests are in `supabase/tests/admin_access.sql`; run only against an isolated Supabase test database.

## Scope

Free book and content management first. Paid books can be authored as drafts. Paid publication, checkout, parent purchases, entitlements, private R2 downloads, final recorded audio and articulated animal animation are subsequent work. There are no active buying controls.
