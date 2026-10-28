# Implementation handoff — free book first

Local preview: **http://127.0.0.1:4187/**. Book management: **http://127.0.0.1:4187/#/admin**. Enter **grown up** at the reading gate. Start the preview with `npm run build` then `npm run preview -- --port 4187 --strictPort`.

## Delivered

- NuvoKids Books branding, responsive bookshelf and installable PWA manifest/icons.
- Complete free farm book: separate editable cover, twelve story scenes, 36 authored tap areas, object transcripts, story replay, Explore and optional Find it.
- One cancellable audio channel. Rapid taps, navigation, parent dialogs, backgrounding and mute stop old playback. Quiet preview tones and browser narration are explicitly identified as development media.
- Parent reading gate; saved settings for narration, sound, motion, labels and bookshelf availability.
- IndexedDB settings, reading position, media blobs and complete download snapshots. Two download workers, bounded retries, SHA-256/size verification, resume/cancel, disk-size display and removal. Atomic ready state preserves a previous complete version when an update fails.
- Versioned service-worker shell with immutable bundle caching and offline navigation. A regression test covers `Vary: Origin`, which previously caused cached JavaScript to miss on offline reload.
- Book Studio: add books, metadata-only drafts, series/creator information, scene JSON, preview, reading order, draft/published/archive state, search/filter, import/export, stable IDs, validation and unsaved-edit protection. No hard-coded four-book catalogue limit; a unit test covers twenty titles.
- Optional Supabase email-code admin sign-in, explicit admin membership checks and RLS migration. Free published manifests can be public; draft/archived/paid content is restricted. Browsers cannot assign admin roles or delete book records. Paid publishing is blocked until the separate entitlement service exists.

## Verification

- TypeScript production build and service-worker generation pass.
- Ten unit tests pass: schema/order/identity rules, twenty-book visibility, Find it exclusions/responses, stale audio cancellation, verified download completion, corrupt replacement protection, previous-version preservation, and offline shell matching.
- Three Chrome browser flows pass: anonymous reading/Explore/Find it/page picker; parent gate/settings persistence/download/offline reload; draft creation/validation/publication/persistence/archive. These also cover 390px mobile overflow, landscape switching, portrait-tablet scene ratio, and unsaved admin edits.
- Bookshelf, reader and Book Studio were visually inspected in the in-app browser.
- Dependency install audit reported zero vulnerabilities. Build emits nonfatal dependency comment-annotation warnings from Zod.

These are desktop browser and emulated viewport results, not physical-device acceptance. Hosted SQL tests are supplied but have not been executed against a configured Supabase project. No live deployment or DNS changes were made.

## Still required

1. **Shared platform administration:** configure Supabase, apply the migration, provision the admin role, verify delivered email OTPs and database authorization. Until then, Book Studio clearly operates locally on this device. Follow `docs/PLATFORM_SETUP.md`.
2. **Production book media:** final recordings, actual animal effects, layered/articulated animation and illustration corrections. The current edition has static interactive artwork, browser speech and preview tones; see `docs/ASSET_STATUS.md`.
3. **Hosted release acceptance:** privacy/terms/support review, target-device tests, installed PWA behavior and hosted security checks.
4. **Later catalogue/commerce work:** more book content, paid entitlements, Stripe test flows and private R2 delivery. No buying controls or live payments are enabled.

Existing source documents and original images were preserved. This directory was not an existing Git checkout, so no commit or pull request was created.
