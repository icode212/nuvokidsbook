# Books cloud and offline delivery

Books uses the NuvoKids Supabase project without modifying the Games billing tables. Apply the two Books migrations in order. `book_catalogue` exposes published metadata; full paid manifests require an active `book_entitlements` row. Parents can read only their own purchases and entitlements and cannot create either. Ownership has no expiry. Checkout, payments and webhook endpoints always reject requests; enabling payments requires a separate reviewed implementation.

## Hosting configuration

`wrangler.jsonc` defines the Pages project, public Supabase configuration and R2 bindings. Set `DOWNLOAD_SIGNING_SECRET` as an encrypted production secret (at least 32 random bytes). Never prefix it with `VITE_`, commit it, or put Supabase service credentials in the browser. Both R2 buckets keep direct public access disabled. Free assets are served through `/api/assets/free/`; private assets require a short-lived book/version download grant. Authorization runs before any private edge-cache lookup.

Build with `npm ci --legacy-peer-deps && npm run build`, output `dist`. Pages Functions are in `functions/api/`. Only `/api/*` invokes Functions; the application shell and crew files stay static on Pages. The public catalogue is edge-cached for five minutes. Immutable free files have one-year HTTP caching. Paid file transfers validate one grant per request without querying Supabase per file.

## Upload and publish books

1. Compress illustrations and recordings before upload. Keep source artwork and WAV files outside delivery packs. Never put paid story assets in `public/`, Git builds or the public bucket.
2. Free media uses `/books/BOOK_ID/VERSION/...` paths in manifests; upload to identical R2 keys without the leading slash in `nuvokids-books-public`. `node scripts/prepare-cloud-content.mjs` prepares the existing farm book under `output/r2-public/` and a non-overwriting SQL seed.
3. Paid books use a public preview cover `/books/BOOK_ID/VERSION/cover.webp` in the public bucket. All story images, effects and narration use `/private/books/BOOK_ID/VERSION/...`. Upload those files to `nuvokids-books-private` at `books/BOOK_ID/VERSION/...` (omit `/private/`).
4. Create `inventory.json` with `bookId`, `contentVersion`, and `assets: [{url, bytes, sha256}]` for every required delivery file, including the public cover. Paid inventory lives in the private bucket and its manifest path is `/private/books/BOOK_ID/VERSION/inventory.json`. Use actual byte lengths and lowercase SHA-256 hashes. Every private asset must use the same book/version prefix.
5. Import a manifest in Book Studio as a draft. Review scenes, paths and rights; publish only after uploading the complete immutable pack. Use a new content version and new paths when bytes change. Keep old published versions for existing offline downloads. There is no fixed catalogue size.

Parent sign-in uses email magic links. Add exact Pages and custom-domain redirect URLs to Supabase Auth without removing existing Games redirects. Book Studio's code sign-in additionally needs an email template containing `{{ .Token }}`, or parents can sign in through Grown-ups first. Assign the chosen existing Auth user UUID to `platform_admins` through a privileged SQL session; ordinary accounts never gain admin access. No admin is provisioned automatically.

## One-time purchase cost model

Free reading requires no account. A complete download stores its manifest and verified media blobs in IndexedDB; two bounded workers resume valid chunks and switch the ready record only after every file passes size/hash checks. Paid downloads are scoped to the signed-in account, and account changes abort in-flight downloads and close the reader. Complete previous versions survive failed updates. Reopening a saved book uses local content without entitlement or media requests; account restoration and new downloads require the server. Offline ownership is local convenience, not DRM: a person controlling their device can copy downloaded content. Browser storage can be evicted; request persistent storage and offer restoration rather than promising permanent device storage.

The shell is cached by the service worker. Catalogue and free manifests have a device cache; public platform configuration persists for cold offline restarts. No polling, recurring subscription, per-play database writes, or payment provider is installed. Remaining running costs depend on storage, initial downloads/restores, Functions, and the Supabase plan. Cache availability is not a guarantee of zero cost.

## Verification and release

Run `npm test`, `npm run build`, `npm run test:e2e`, and the rollback-only SQL authorization tests. Verify public asset hashes against the inventory, anonymous paid-file denial, disabled checkout, and a cold offline reload after saving. Validate parent email delivery, restoration on a second device and real mobile installed-PWA playback before enabling sales. Database backup and privacy/support policy review remain operational responsibilities.

Hosted read-only/own-device checks: `npm run test:e2e -- --config playwright.hosted.config.ts` runs the story and offline tests against Pages, excluding the catalogue-authoring test. On 2026-10-28 these two hosted tests passed; all 98 media hashes and the inventory matched R2 delivery. The 24 unit tests, three local browser tests and Functions compilation also passed. Parent email delivery, admin assignment and a real purchased-book restoration remain unverified while redirect approval/admin identity are pending and payments are disabled. The custom domain has been added in Pages but awaits an external CNAME: `books` → `nuvokidsbook.pages.dev`.
