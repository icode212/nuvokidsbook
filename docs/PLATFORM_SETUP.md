# Platform administration and deployment

> Superseded deployment instructions: see [Books cloud and offline delivery](BOOKS_CLOUD_SETUP.md) for the R2, parent accounts, one-time ownership and disabled-payments architecture. The original free-only setup below is retained as historical context.

## Local authoring vs shared platform

With no Supabase variables, Book Studio is a local authoring tool, behind the parent reading gate. It has no security claim: a person controlling their browser can edit local data. Do not use local mode as a shared admin backend.

With either Supabase variable present, the application switches to cloud mode and requires both variables. It does not silently fall back to local authoring on an authentication/configuration failure. The cloud catalogue starts empty; seed the farm book as described below. Public clients can read only published free books. Supabase RLS enforces all writes using explicitly provisioned platform admin IDs. The parent gate is a UI boundary, not admin authorization.

## Provision Supabase

1. Create an isolated Supabase project for testing. Apply `supabase/migrations/202610280001_book_studio.sql` using the SQL editor or Supabase CLI migrations.
2. Create the intended admin in Supabase Auth through a privileged dashboard/admin process. The browser OTP flow uses `shouldCreateUser: false`; it cannot create arbitrary admin accounts.
3. With a privileged SQL session, assign that immutable Auth user ID:

   ```sql
   insert into public.platform_admins(user_id) values ('YOUR_AUTH_USER_UUID');
   ```

   Do not place a service-role key in the client. Ordinary authenticated users cannot assign themselves roles or write books. No DELETE privilege is granted; archive books instead.
4. Configure production SMTP, email OTP templates to include `{{ .Token }}`, appropriate rate limits, and exact Books site/redirect origins. Confirm delivered codes actually verify. The Supabase default template sends a magic link; this UI expects a code.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or the Cloudflare Pages build environment. Only public URL/public anon or publishable key belongs here. Rebuild after changes.
6. Before switching a local workspace to cloud mode, export the farm manifest from Book Studio. In cloud mode, sign in as the admin, import it (import starts as draft), review it, set Published, then save. Supplied versioned farm images are already part of the deployed app. Local authoring records are not silently copied into the cloud.
7. Run SQL authorization tests in the isolated database and browser tests with anonymous, ordinary-parent and admin sessions. Confirm non-admin direct REST writes fail, drafts cannot be read anonymously, and revoked admins cannot write. These checks have not been run against a hosted project in this implementation session.

## Book authoring workflow

Use **Add a book** to save metadata as a draft. Add scene JSON matching `src/content/schema.ts`, or use **Import** for a complete manifest with a new stable ID. Import never overwrites an existing book. For existing books edit their metadata/scenes and use a new content version when assets change. Stable asset paths are immutable per version.

Current asset paths are same-origin absolute paths (`/books/…`), preventing arbitrary external scripts/asset URLs in manifests. Prepare/upload compressed delivery images through the repository/Cloudflare content pipeline. No image uploader or server-side publishing CLI is implemented yet. A future private R2 workflow will serve paid packs through authorization. Never upload paid assets into `public/`.

New free books need no new reader components. Public free manifests live in the database in cloud mode. Download inventories list required images with actual sizes and SHA-256. The app fetches them in two bounded workers, verifies bytes, persists chunks in IndexedDB, and switches the ready record only after all succeed. Complete previous versions remain available until a successful update. Partial chunks resume on retry and can be removed with Remove download once a saved record exists; partial-only cleanup is an outstanding improvement. Do not reuse a content version for changed bytes.

The initial schema intentionally prevents paid publication. Future paid catalogue metadata and private manifests need separate access boundaries, product/ownership tables, and private R2 authorization before lifting that constraint. This free phase has no four-book assumption or launch-bundle logic.

## Cloudflare Pages

- Build: `npm ci --legacy-peer-deps && npm run build`
- Output: `dist`
- Node: 22.12+ (tested locally with 22.21.1)
- Add Books-specific environment variables; configure `books.nuvokids.com` through Pages custom domains and the returned DNS instructions. DNS and a hosted deployment have not been configured here.
- Serve at the origin root. Manifest and service worker scope are `/`. This build is not configured for a path-prefix deployment.
- `_headers` supplies CSP, framing, permissions and MIME protection. If assets move to R2, review CSP and exact-origin R2 CORS together.
- The service-worker shell version derives from built bytes. New workers wait for existing controlled tabs to close, so updates do not replace the shell beneath an active reader.
- Supabase must allow the exact Books origin. No shared parent-domain auth cookies or URL token exchange.

## Recovery and release gates

Keep source art and old published delivery versions. Export book manifests before substantial changes. Enable database backups on the configured project and test restore on a separate project. A previous Pages deployment can be rolled back while keeping compatible immutable asset versions available.

Before a public release: complete final assets and educational review, verify OTP/RLS in the configured project, review privacy/terms/support and launch markets, verify real iPhone/iPad/Android sound unlock/backgrounding/orientation and installed PWA reopening. Browser voice and preview tones do not fulfill production audio acceptance. No payments should be activated as part of this free-book phase.

Implementation references checked during development: [Vite](https://vite.dev/guide/), [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [speech cancellation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).
