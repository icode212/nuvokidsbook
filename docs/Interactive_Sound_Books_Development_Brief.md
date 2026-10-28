# NuvoKids Books — AI Development Brief

## 1. Mission and instructions to the implementing agent

Build a complete, maintainable PWA for children aged 2–5 to explore illustrated sound books. Children tap an object, see a gentle animation, hear its name, and hear an appropriate sound. Parents purchase books once and restore access by signing in on another device.

Product name: **NuvoKids Books**. Intended production address: **books.nuvokids.com**. Installed PWA full name: NuvoKids Books; short name: Nuvo Books. Tagline: **Little stories. Big discoveries.** Use English initially; design content for future languages.

### NuvoKids product family

| Product | Intended address | Scope |
| --- | --- | --- |
| NuvoKids | nuvokids.com | Parent-facing hub introducing the family of products |
| NuvoKids Books | books.nuvokids.com | This interactive story and sound-book PWA |
| NuvoKids Games | games.nuvokids.com | Separate learning-games app |
| Nuvo ABC | abc.nuvokids.com | Companion website for the existing React Native handwriting/letter-practice app |

Keep **Nuvo ABC** as its existing product name; optional parent-area wording: “Part of NuvoKids.” Do not rebuild or modify Nuvo ABC, build the hub/games, register domains, or imply these addresses are already configured as part of this brief. Implement the Books app and document deployment/DNS steps. Product URLs must be configurable.

**Nuvo & the Wonder Crew** is the flagship book series, not the app name. Leave room for future series and characters. Catalogue metadata must distinguish app, series, book title, author/creator credit, and content version.

Launch with a Books parent account only. Shared branding and parent-gated links connect the products. Future shared parent identity is desirable but must not delay launch or silently link existing accounts. Use stable user IDs and product-scoped entitlements. Subdomains have separate browser storage; do not assume they share Supabase sessions or downloaded books. Do not implement broad parent-domain auth cookies or share tokens through URLs. Future SSO and native-app purchase interoperability require a separately reviewed design. Buying a Books bundle does not unlock Nuvo ABC, games, or future books.

Implement the product and the four launch books described below. Work in coherent phases, but do not stop at a mockup or one-scene demo. Create runnable, manifest-driven book content, narration scripts, find-it prompts, asset inventories, and production asset briefs. If final art or recorded audio cannot be produced with available tools, provide clearly marked development placeholders and an explicit missing-assets report. Never describe placeholders or browser speech as production-ready content.

Use Vite + React + TypeScript, Cloudflare Pages, Supabase Auth/PostgreSQL/Edge Functions, and Cloudflare R2. No Cloudflare Worker is required for the launch architecture. No D1, Realtime, child accounts, subscription system, or custom authentication implementation.

Keep technical explanations out of child-facing and ordinary parent-facing UI. Keep screens compact, polished, and uncluttered. Use good boundaries, small modules, strict types, schema validation, migrations, meaningful tests, and documentation. Do not put the entire engine in one component. Inspect an existing repository before scaffolding; preserve unrelated work. Verify current official API documentation during implementation.

## 2. Launch catalogue and prices

Launch with **four books: one complete free storybook and three paid interactive discovery books**. Four is enough to demonstrate variety and support a useful bundle without delaying launch for a large catalogue.

| ID | Title | Access | Scenes | Primary subject |
| --- | --- | --- | --- | --- |
| a-day-at-the-farm | A Day at the Farm | Free, no login required | 12 + cover | Animals, their needs, and gentle care |
| animal-adventures | Animal Adventures | CAD 3.99 once | 5 | Wildlife in different habitats |
| things-that-go | Things That Go | CAD 3.99 once | 5 | Vehicles and their sounds |
| little-world | My Little World | CAD 3.99 once | 5 | Everyday objects, actions, and routines |

Sell the **Launch Collection**, consisting of exactly the three paid books, for **CAD 9.99 once**. Separately they total CAD 11.97; savings CAD 1.98. Do not include future books automatically. The free book stays free and is not counted as a paid bundle benefit.

Use integer minor units: 399 and 999, currency CAD. Payment prices are controlled server-side. Show applicable taxes clearly through the configured checkout; verify launch tax setup separately. Do not hard-code processor fees or claim a guaranteed profit.

Ownership rules:
- One parent account can sign in on multiple devices. No activation codes or arbitrary device limit at launch.
- Keep free exploration available without an account.
- Sign in before a purchase; bind checkout to the authenticated parent's immutable user ID.
- Hide buying controls in the child area. Parent area contains prices, checkout, restoration, receipts links, and download controls.
- Disable purchase of already owned single books.
- Offer CAD 9.99 bundle only when none of its books is owned. After a partial purchase, explain existing ownership and offer remaining books individually; do not silently charge for duplicates. Dynamic upgrade pricing is deferred.
- Prevent accidental overlapping checkout attempts where practical; recover and reconcile any duplicate paid order rather than dropping it.

## 3. Child experience

Opening screen: a calm bookshelf with the free book and owned books. Include a parent-controlled option to hide unowned covers, enabled by default. The free book must demonstrate the same interaction quality as paid books; do not interrupt it with upsells.

Book flow: cover → illustrated scene → tap objects → move to next/previous scene. Use large familiar icons, minimal text, generous spacing, and explicit controls. Support portrait and landscape through a fixed scene coordinate system with contain scaling and decorative margins; never crop interactive objects to fill the screen.

Two launch modes:
1. **Explore:** tap any interactive object.
2. **Find it:** a voice asks for one visible object; touching it gives a gentle celebration. Wrong choices receive a neutral hint such as “Let's look again.” No score, timer, lives, penalties, leaderboards, or forced progression.

Typical tap sequence: immediately animate the selected object, play one short narration line, then its sound. Optional word label is shown when enabled. Tapping a new object cancels the previous foreground sequence and starts the new one. Repeated taps must not stack voices, sound effects, timers, or animations. Find-it mode must not accidentally reveal the requested answer by reading a wrong object's name.

Audio: no autoplay on page load. Start/unlock audio from a user gesture, handle mobile browser suspension, stop foreground audio on navigation/backgrounding, and resume only intentionally. Use a single audio controller with stale-request cancellation. Provide narration and sound switches in the parent area. No background music at launch. Normalize sound assets; no sudden loud horns, sirens, roars, or frightening effects.

Animation: short, gentle CSS/transform motion such as bounce, wiggle, wheel rotation, float, or head nod. Honor reduced-motion preference and provide a parent switch. No flashing or endless distracting motion. Keep animal contact with the ground visually believable.

Accessibility: keyboard activation, accessible object names, visible focus for adult use, touch/pointer support, text transcripts, mute controls, and no color-only instructions. Use large touch areas, ideally at least 64 CSS pixels where scene geometry permits, and resolve overlapping targets deliberately. Test real small-screen layouts.

Parent gate: a deliberate adult reading interaction before settings, purchases, external links, and account management. It is a UI boundary, not authentication or payment authorization. Do not claim a math puzzle proves adulthood.

## 4. Visual direction and scene production

Warm picture-book illustration, rounded forms, expressive friendly characters, soft cream backgrounds, teal navigation, amber highlights. Use one consistent palette and rendering style across books. No ads or sponsor logos inside books.

Generated full-page images are flattened artwork, not animation-ready layers. Reuse approved page compositions as guides, then prepare a clean background plate and separate transparent interactive subjects. Repair the old subject location so moving a layer does not reveal a duplicate baked-in subject. For a nod, tail swish or ear twitch, provide separated articulated parts with author-defined pivots or a short reviewed sprite sequence; moving a whole flat cow does not count as a head nod. Keep both render modes in the engine: static illustrated scenes with hit areas for development, and layered animated scenes for final production. Explicitly label static-only pages as incomplete animation work; do not claim a hotspot alone animates a pictured animal.

Each scene uses a noninteractive background plus separate transparent object layers. Do not bake interactive characters into the background and then place duplicates on top. Keep foreground subjects distinct and avoid visual clutter. Use authored hit polygons or normalized boxes; default image bounds alone may include excessive transparent padding.

Asset briefs must specify framing, palette, object scale, transparent background requirements, clean silhouettes, and exact scene placement. Generate backgrounds without embedded text or interactive subjects. Generate/export individual subjects separately. Review every asset for accidental text, incorrect anatomy, and unsuitable content.

Store text independently from artwork. Use WebP/AVIF where tested and suitable; preserve alpha. Maintain higher-resolution art masters outside delivery packs. Prefer brief compressed audio files with broadly supported formats. Each book should target roughly 15–40 MB compressed initially; measure actual quality and sizes rather than meeting an arbitrary number.


## Character and series bible

**Series:** Nuvo & the Wonder Crew. **Team:** Nuvo, Milo, Lina, Pip and Mimi. Recurring invitation: “What will we discover?” Themes: curiosity, friendship, listening, kindness, asking for help and trying again. Children take turns noticing and solving; no character is always right or always needs help. No combat, villains, competitive scores, national/religious symbols, stereotypes or franchise imitation.

| Character | Locked visual identity | Personality and story role |
| --- | --- | --- |
| Nuvo | Five-year-old boy, warm medium-brown skin, dark brown eyes, short softly wavy dark brown hair with a front curl; teal T-shirt, mustard-yellow short overalls with front pocket, cream sneakers, coral-red backpack | Curious initiator; asks questions, makes guesses and learns with friends |
| Milo | Five-year-old boy, lighter warm skin, brown eyes, straight chestnut-brown hair with side fringe, round blue glasses; coral-orange T-shirt, navy shorts, cream sneakers, blue crossbody notebook/crayon pouch | Thoughtful builder; notices patterns, sketches and tests ideas |
| Lina | Five-year-old girl, deep brown skin, dark brown eyes, tightly curled black hair in two rounded puffs with lavender ties; lavender T-shirt, sage-green short overalls, cream sneakers, yellow backpack with flower patch | Imaginative explorer; notices sounds, suggests possibilities and listens to friends |
| Pip | Small cream-and-caramel puppy, floppy caramel ears, brown eyes, caramel patch around anatomical left eye, short legs, curled tail, plain teal harness | Nuvo's affectionate puppy; Mimi's best friend; often notices an interesting sound |
| Mimi | Lina's small young silver-grey kitten, cream muzzle/chest bib, four white paws, green eyes, pink nose, upright ears, lavender collar; short-to-moderate proportionate tail with cream tip | Observant and playful; Pip's best friend; watches before joining |

**Mimi tail correction is authoritative:** earlier concept art shows an oversized tall fluffy tail. Keep it visibly shorter and kitten-proportionate, gently curved near her body, not a large dog-like plume. Apply this correction to new art and flag inconsistent old pages. All animals have natural species anatomy. Children have consistent five-year-old proportions and small rounded hands. Use reference sheets for identity; obtain actual reference files instead of relying on vague prompts alone.

Style: warm softly textured gouache, rounded shapes, expressive gentle faces, coherent scale and perspective. No photorealistic/3D style switch between pages. No identity drift, extra fingers/legs, changed glasses, misplaced fur patches or inconsistent clothing. Maintain a reference board and page-by-page QA checklist.

## 5. Launch book content

Every object listed below is an interactive target. Narration and sound are distinct files; onomatopoeia in a script describes the sound, not a requirement that a narrator imitate an animal. Use licensed recordings or commissioned/generated audio with verified commercial rights. Maintain an asset rights ledger. Do not invent animal sounds where there is no appropriate sound: use a gentle associated action, or no sound, clearly specified below.

For Find it, create “Where is the [label]?” for every target, recorded separately or assembled from reviewed recordings with natural results. Create two shared positive lines: “You found it!” and “There it is!” Allow repetition. All content gets an adult educational and audio review before publication.

### Free book: A Day at the Farm

**Series:** Nuvo & the Wonder Crew. **Length:** 12 story pages plus a separate cover. One page equals one illustrated interactive scene, not a two-page print spread. Free forever for this launch offer; no login, interruption, or purchase needed. Include Explore, optional Find it, story narration/replay, offline download and unlimited replay.

**Story question:** “What makes a happy farm?” Teach familiar names and sounds alongside food, fresh water, dry shelter, and gentle care. The chick reunion provides a simple narrative arc: notice → listen → ask an adult → give space → reunite. Do not turn it into a chase/rescue game. Use one or two short sentences per page and three primary tap targets. Additional vocabulary such as calf, lamb, hen, and chick is optional through taps. No pig content in launch books.

| Page ID | Title | Approved story narration | Primary tap targets / sound / movement |
| --- | --- | --- | --- |
| 01-welcome | Welcome to the Farm | The farm is waking up. What can we hear? | Birds: chirp/wing lift; distant cow: moo/head nod; barn door: creak/small opening |
| 02-cow | Hello, Cow! | Moo! A cow stands beside her calf. They stay close together. | Cow: moo/head nod; calf: soft reviewed calf call/ear twitch; cow tail: gentle swish |
| 03-sheep | Breakfast for the Sheep | The sheep are eating grass. Pip watches quietly beside Nuvo. | Sheep: baa/head lift; lamb: soft baa/ear twitch; grass: rustle/sway |
| 04-chicken | A Busy Chicken | Cluck, cluck! A hen scratches the ground. Her chicks follow behind. | Hen: cluck/head bob; chicks: peep/small steps; scratching feet: soil scrape/short scratch |
| 05-pond | Down by the Pond | The ducks paddle across the pond. Mimi watches from the path. | Ducks: quack/paddle; water: ripple sound/rings; reeds: rustle/sway |
| 06-horse | A Gentle Hello | The farmer shows Lina how to greet the horse. Lina waits while the horse comes closer. | Horse: soft neigh/head dip; ears: quiet twitch with no invented sound; hoof: gentle tap |
| 07-water | What Do Animals Need? | Milo notices the water trough. Animals need fresh water, too! | Water stream: pouring/flow; cow: drinking/head dip; bucket: gentle clunk/settle |
| 08-rain | Here Comes the Rain | Drip, drop! The farmer opens the shelter. The animals have a dry place to rest. | Rain: soft patter/drops; shelter door: creak/open; sheep: straw footsteps/step inside |
| 09-peeping | Something Is Peeping | Peep, peep! A chick is beside the wrong fence. Its hen is calling nearby. | Separated chick: peep/head turn; hen: cluck/head bob; Pip ears: listening tilt without bark |
| 10-space | Let's Give It Space | Everyone steps back. The farmer opens the little gate, and the chick follows its hen. | Gate: creak/open; chick: tiny steps/walk through; reunited chicks: peep/gentle bob |
| 11-happy-farm | A Happy Farm | Food, water, shelter—and gentle care. Now the crew knows what animals need. | Grazing sheep: grass rustle/head dip; drinking cow: water sound/head dip; shelter: quiet sheep sound/highlight dry straw |
| 12-goodbye | Goodbye for Now | “Thank you, farm!” says Nuvo. “What did you discover today?” | Visible cow: moo; visible sheep: baa; farmer: friendly goodbye/wave; optional favourite-animal replay |

Keep object-identification narration separate from the approved story lines. For every primary target write an explicit transcript, narration asset, sound asset or intentional null, animation specification, hit area and Find-it eligibility. Non-object actions such as listening ears need custom Find-it wording, or exclusion from Find it; never mechanically generate awkward “Where is the pouring?” prompts.

Continuity and composition:
- All five crew members appear across the story; use natural varied staging rather than repeating the same layout every page. They do not all need to be tappable on every page.
- Farmer: friendly adult with warm tan skin, short dark hair, dark beard, straw hat with dark band, blue shirt, denim work overalls, brown boots. Remains the same person.
- Red barn, wooden fences, chicken coop and paths belong to the same farm. Morning arrival → light rain → clearing sunshine → afternoon goodbye.
- Brown hen has exactly three yellow chicks: on page 9 one is separated by a closed small gate, two remain with her; page 10 gate opens and the third rejoins. All three remain with her afterward.
- Cow and calf stay recognizably the same animals. Sheep/lamb have cream wool; horse is chestnut with a cream blaze.
- Children observe livestock from visitor areas. Adults guide animal encounters. No unsupervised feeding, chasing, reaching through fences, or approaching water.
- Pip and Mimi stay calm and restrained away from livestock. Show believable loose lead attachment; do not attach Mimi's lead to her collar. Use a simple lavender kitten harness whenever a lead is visible, as a documented accessory variant, preserving her face and fur.
- On page 7 give Milo a clear noticing role rather than letting Nuvo perform every action. On page 6 Lina is the child guided by the farmer.
- Page 10 must visually show a clear open passage, chick heading toward hen, and children giving space.
- Page 12 closes the story without an upsell. A favourite-animal replay can reuse audio from this book and does not require replaying whole pages.

**Cover brief:** Nuvo, Milo, Lina, Pip and Mimi at the welcoming farm, friendly cow/calf, red barn and a hint of ducks. Display “A Day at the Farm” prominently and “Nuvo & the Wonder Crew” as series credit. Keep cover typography as editable app/design layers rather than baked into generated art where possible.

**Existing illustrations:** Character sheets, group portrait and twelve story illustrations have been generated during concept development. Treat them as continuity references and candidate masters, not proof of final layered assets or completed audio. Obtain exact files from the owner/available assets; never invent paths or claim assets exist in the repository. Review page aspect ratios, anatomy, fences, character action roles, animal counts and Mimi's tail before approval. Some concept pictures need corrections. Do not regenerate approved images unnecessarily.

### Paid book 1: Animal Adventures

Five scenes, twenty targets. Stylized habitat introductions, not a claim that all animals share one location or are active together. Use accurate adult-reviewed labels; avoid simplistic factual claims about habitats or sounds.

| Scene / background | Target | Narration | Sound | Animation |
| --- | --- | --- | --- | --- |
| Savanna / warm grass and distant trees | Lion | This is a lion. | Quiet friendly roar | Mane wiggle |
| Savanna | Elephant | This is an elephant. | Soft trumpet | Trunk sway |
| Savanna | Zebra | This is a zebra. | Hoof steps, associated action | Small step |
| Savanna | Giraffe | This is a giraffe. | Leaf rustle, associated action | Neck dip |
| Rainforest / layered leaves and branches | Monkey | This is a monkey. | Reviewed gentle monkey call | Small swing |
| Rainforest | Parrot | This is a parrot. | Soft squawk | Wing lift |
| Rainforest | Butterfly | This is a butterfly. | None | Wing flutter |
| Rainforest | Tree frog | This is a tree frog. | Reviewed frog call | Small hop |
| Woodland / trees, log, clearing | Owl | This is an owl. | Hoot | Head turn |
| Woodland | Squirrel | This is a squirrel. | Nut nibble, associated action | Tail flick |
| Woodland | Woodpecker | This is a woodpecker. | Gentle tapping | Beak tap |
| Woodland | Deer | This is a deer. | Soft steps, associated action | Ear twitch |
| Ocean / shallow illustrated reef | Dolphin | This is a dolphin. | Gentle reviewed clicks | Small glide |
| Ocean | Whale | This is a whale. | Soft reviewed whale call | Tail lift |
| Ocean | Sea turtle | This is a sea turtle. | None | Flipper paddle |
| Ocean | Fish | This is a fish. | None | Gentle swim |
| Animal homes / four clearly separated vignette panels | Penguin | This is a penguin. | Soft reviewed call | Waddle |
| Animal homes | Polar bear | This is a polar bear. | Footsteps, associated action | Paw lift |
| Animal homes | Seal | This is a seal. | Gentle reviewed call | Flipper wave |
| Animal homes | Arctic fox | This is an Arctic fox. | Soft reviewed call or none | Tail curl |

The final scene uses separate home panels: do not imply penguins and polar bears live together. Cover: elephant, parrot, dolphin in distinct habitat vignettes. Opening: “Let's meet some animals. Tap to explore!”

### Paid book 2: Things That Go

Five scenes, twenty targets. Objects are parked or move only briefly within their own area. Avoid dangerous traffic behavior or noisy emergency scenarios.

| Scene / background | Target | Narration | Sound | Animation |
| --- | --- | --- | --- | --- |
| Town / calm street with sidewalk | Car | This is a car. | Quiet engine | Wheel turn |
| Town | Bus | This is a bus. | Gentle engine | Small bounce |
| Town | Bicycle | This is a bicycle. | Soft bell | Wheel turn |
| Town | Delivery van | This is a delivery van. | Gentle engine | Small roll |
| Building site / fenced safe work area | Excavator | This is an excavator. | Quiet hydraulic movement | Arm dip |
| Building site | Dump truck | This is a dump truck. | Gentle engine | Bed tip |
| Building site | Crane | This is a crane. | Quiet motor | Hook lift |
| Building site | Bulldozer | This is a bulldozer. | Gentle engine | Blade lift |
| Station / separated platforms and tracks | Passenger train | This is a passenger train. | Gentle rail rhythm | Short glide |
| Station | Freight train | This is a freight train. | Quiet wheel rhythm | Short glide |
| Station | Tram | This is a tram. | Soft bell | Short glide |
| Station | Ticket machine | This is a ticket machine. | Soft confirmation beep | Button glow |
| Harbour / dock and calm water | Sailboat | This is a sailboat. | Sail flutter | Gentle bob |
| Harbour | Ferry | This is a ferry. | Quiet engine | Gentle bob |
| Harbour | Tugboat | This is a tugboat. | Gentle short horn | Gentle bob |
| Harbour | Rowboat | This is a rowboat. | Paddle splash | Oar stroke |
| Sky / runway and separated airborne objects | Airplane | This is an airplane. | Soft engine | Short glide |
| Sky | Helicopter | This is a helicopter. | Quiet rotor | Rotor rotation |
| Sky | Hot-air balloon | This is a hot-air balloon. | Short soft burner | Float |
| Sky | Glider | This is a glider. | Soft wind | Short glide |

Cover: bus, train, and balloon. Opening: “Let's explore things that go!” Station includes one useful related object; descriptions must say twenty interactive targets, not twenty vehicles.

### Paid book 3: My Little World

Five scenes, twenty targets. Everyday routines and listening, without presenting dangerous objects as toys. No accessible hot stove, knives, medicine, or cleaning products.

| Scene / background | Target | Narration | Sound | Animation |
| --- | --- | --- | --- | --- |
| Playroom / tidy rug and low shelves | Ball | This is a ball. | Soft bounce | Bounce |
| Playroom | Blocks | These are blocks. | Wooden clack | Gentle stack wiggle |
| Playroom | Toy drum | This is a drum. | Two quiet beats | Surface pulse |
| Playroom | Teddy bear | This is a teddy bear. | None | Friendly wave |
| Breakfast table / cool food and safe utensils | Cup | This is a cup. | Gentle set-down | Small tilt |
| Breakfast table | Spoon | This is a spoon. | Soft clink | Wiggle |
| Breakfast table | Apple | This is an apple. | Gentle crunch, associated action | Small bounce |
| Breakfast table | Bowl | This is a bowl. | Soft set-down | Wiggle |
| Getting ready / bench and low hooks | Shoes | These are shoes. | Footsteps | Small stepping motion |
| Getting ready | Jacket | This is a jacket. | Zipper | Zipper movement |
| Getting ready | Hat | This is a hat. | None | Small tilt |
| Getting ready | Backpack | This is a backpack. | Soft zip | Zip movement |
| Park / accessible path, garden, rain vignette | Bird | This is a bird. | Chirp | Wing lift |
| Park | Leaves | These are leaves. | Rustle | Sway |
| Park | Puddle | This is a puddle. | Gentle splash | Ripple |
| Park | Flower | This is a flower. | None | Gentle sway |
| Bedtime / cozy room, no distressing darkness | Toothbrush | This is a toothbrush. | Gentle brushing | Small brushing motion |
| Bedtime | Book | This is a book. | Page turn | Page lift |
| Bedtime | Blanket | This is a blanket. | Fabric rustle | Small fold lift |
| Bedtime | Lamp | This is a lamp. | Soft switch click | Warm light fade |

Cover: teddy bear, ball, and storybook. Opening: “Let's explore your little world!” Do not suggest sleeping with unsafe objects or show children operating electrical plugs.

## 6. Content engine and schema

Support a story layer in addition to object exploration: each scene has pageNumber, title, storyText, storyNarrationAssetId, optional sceneTransition, primaryTargets and optional Find-it prompts. Catalogue has seriesId and bookKind (story or discovery). Story playback is user-initiated; tapping an object interrupts the story voice cleanly, and Replay Story starts narration again deliberately. Never auto-stack page narration with effects.

Create shared TypeScript types plus runtime schemas for catalogue, book manifest, scene, interactive object, audio cue, and localized string resources. Use stable IDs, schemaVersion, contentVersion, and immutable asset paths. Public catalogue contains covers, summaries, prices for display, and size metadata only. Full paid manifests and assets stay private.

Normalized scene coordinates: x, y, width, height in 0–1; define origin and anchor explicitly, plus zIndex and optional hit polygon. Include animation preset, spoken text/transcript, narration asset ID, optional sound asset ID, and find-it prompt asset ID. Preserve semantic labels for singular/plural phrases.

Example shape (asset IDs resolve through the versioned asset inventory):

```json
{
  "schemaVersion": 1,
  "bookId": "a-day-at-the-farm",
  "contentVersion": "1.0.0",
  "locale": "en-CA",
  "scenes": [{
    "id": "02-cow",
    "pageNumber": 2,
    "title": "Hello, Cow!",
    "storyText": "Moo! A cow stands beside her calf. They stay close together.",
    "storyNarrationAssetId": "page-02-story",
    "backgroundAssetId": "farmyard-bg",
    "objects": [{
      "id": "cow",
      "label": "Cow",
      "transcript": "This is a cow.",
      "imageAssetId": "cow-image",
      "narrationAssetId": "cow-name",
      "soundAssetId": "cow-sound",
      "findPromptAssetId": "find-cow",
      "rect": { "x": 0.15, "y": 0.45, "width": 0.28, "height": 0.35 },
      "anchor": "top-left",
      "zIndex": 2,
      "animation": "head-nod"
    }]
  }]
}
```

Book production CLI: validate schema/references/unique IDs/coordinates; inventory files; calculate byte counts and SHA-256 checksums; reject missing assets; build versioned manifest and upload pack assets to R2. Never expose admin upload tools publicly. No visual content editor at launch. Book additions must not require editing React scene components.

## 7. Authentication, purchases, and ownership

Supabase passwordless email OTP for Books parents. Other NuvoKids apps are out of scope for account migration or automatic linking. Configure production SMTP (for example Resend), permitted redirect origins, rate limits, and abuse controls. Verify actual OTP configuration; do not assume default email templates send the intended code. Remember sessions safely through supported Supabase client behavior. Provide sign-out, restore purchases, and account deletion flow. Do not ask children for names, birthdays, photos, email, or microphone access.

Tables with migrations and appropriate constraints:
- books: stable ID, published status, active content version, free flag, public metadata.
- products / product_books: server-side single/bundle mappings, provider price IDs, currency, minor-unit price, active flag.
- orders: user ID, provider checkout/payment IDs, status, amount, currency, timestamps; unique provider references.
- order_items: snapshot of purchased book IDs and product mapping at purchase time.
- ownership_grants: user, book, source order item, active/revoked status. Preserve separate grants so refunding one overlapping purchase cannot revoke another valid grant.
- payment_events: unique provider event ID, processing status, minimal reconciliation details; avoid storing unnecessary payment payloads or card data.

Effective ownership = any active valid grant, or a free published book. Users can read their own orders/ownership through RLS; clients cannot insert or update payment or ownership records. Catalogue reads expose only published public metadata. Service credentials stay server-side.

Use Stripe Checkout as the initial provider behind a small payment adapter. Do not add another payment provider unless asked. Edge Functions:
1. create-checkout: verify user JWT, accept only known product ID, resolve price/mapping server-side, attach immutable user/order ID, enforce ownership rules.
2. payment-webhook: verify provider signature against raw request body; handle paid/completed state correctly, delayed payment success/failure if enabled, duplicate and out-of-order events, refunds, and disputes. Grant ownership only after confirmed successful payment. Use transactional/idempotent database operations; retry failures and provide reconciliation.
3. authorize-book-download: verify authenticated parent and active ownership; resolve only known server-side asset keys for the requested published book version; return short-lived presigned R2 GET URLs. Free download path needs no account, with abuse controls.

Checkout return UI polls briefly for confirmed ownership, then offers retry/restore if webhook processing is delayed. Never grant access from a success URL, client-supplied price, localStorage flag, or unverified payment reference.

Full refund: revoke grants from that refunded order; partial refund and dispute policy must be explicitly defined before launch rather than guessing which book to revoke. Already downloaded offline files cannot reliably be recalled. Re-check when online and disable further authorized downloads when revoked; do not claim DRM or guaranteed offline revocation.

## 8. R2 and offline downloads

Use private R2 for paid manifests/assets and public delivery for covers/free assets. Supabase Edge Functions generate presigned URLs using server-held R2 credentials. Browser downloads bytes directly from R2; never proxy complete books through Supabase. Presigned R2 S3 URLs are not custom-domain URLs. Configure CORS for exact app origins and GET/HEAD as needed. Keep object paths immutable by content version. Signed URLs are bearer access until expiration; keep them short-lived and out of logs.

Use a service worker for app shell and IndexedDB for local download inventory, settings, and media blobs initially; abstract storage behind an interface. Do not use localStorage for books. Store file hashes, versions, expected sizes, state, and last access. Keep signed URLs out of persistent book manifests; persist asset IDs and bytes instead.

Downloads must support progress, cancellation, bounded concurrency, retries, expired-link refresh, integrity checks, and recovery after interruption. Mark a book ready only after every required file is verified. Preserve the old complete version until an update finishes. Show disk usage and remove-download controls. Detect quota failure; request persistent storage where supported without promising it. Explain in parent settings that browsers may clear downloads and purchases can be restored.

After a complete download, Explore and Find it work in airplane mode after reopening the installed app. No sign-in or entitlement network call is required for every offline opening. Scope account-owned downloads to the local signed-in account; on sign-out, clear local paid content and account-scoped data, explaining this before confirmation. Leave the free book usable. Browser storage is not tamper-proof and this is not DRM.

## 9. Maintainable code layout

Suggested structure:

```text
src/
  app/                 # routing, providers, app shell
  features/
    bookshelf/
    reader/            # scene rendering, interaction state, find-it
    downloads/
    parent-area/
    auth/
    purchases/
  content/             # schemas, types, catalogue adapters
  services/            # audio, local storage, API, Supabase
  components/          # small shared UI primitives
  styles/              # tokens, responsive layout, motion
content-source/
  a-day-at-the-farm/
  animal-adventures/
  things-that-go/
  little-world/
  shared/
scripts/               # validate, package, asset inventory, publish
supabase/
  migrations/
  functions/
    _shared/
    create-checkout/
    payment-webhook/
    authorize-book-download/
docs/                  # setup, content workflow, release checklist
```

Define explicit interfaces for audio playback, book storage, ownership lookup, and payment provider. Keep network access out of scene components. Separate playback state from purchase state. Do not overengineer with a custom plugin framework or microservices. Use environment validation and .env.example with names only; never commit credentials.

## 10. Privacy, operations, and performance

Parent-oriented privacy notice, terms, refund policy, support contact, and deletion process. No advertising, behavioral tracking, third-party embeds, social links, or child-generated content in scenes. Do not claim legal compliance without review of applicable launch markets. Transactional email is parent-directed; no marketing signup by default.

Track minimal operational metrics such as checkout failures and download failures without child tap histories. Keep logs redacted. Add cost limits/alerts where available, R2 lifecycle review for obsolete unpublished versions, database backup/recovery procedures, and payment reconciliation documentation. Do not delete purchased book versions without a migration/re-download plan.

Lazy-load books, preload only the active scene and a small next-scene budget, release object URLs and audio nodes, and cap decoded images in memory. Test mid-range phones/tablets, desktop, Android Chrome, iPad/iPhone Safari and installed PWA behavior. State actual supported browser versions after testing rather than promising universal support.

## 11. Implementation sequence and evidence

### Phase 1 — Engine and free book
Build responsive shelf, reader, audio controller, motion, both play modes, parent gate, offline storage, and all twelve free story pages plus its cover. Add catalogue and manifest validation. Verify rapid taps, orientation changes, and offline reopening on mobile.

### Phase 2 — Complete launch catalogue
The three paid books remain five-scene discovery books for launch; do not silently expand each into a twelve-page story or promise equivalent page counts. State page/scene counts and previews clearly before purchase. Their story expansions can be planned separately.

Create all fifteen paid scenes, four covers, all object manifests, narration scripts and audio inventories, find-it prompts, illustration briefs, and asset rights ledger. Reuse the engine, not duplicated book components. Clearly distinguish completed production assets from temporary placeholders.

### Phase 3 — Parent accounts and commerce
Implement OTP, RLS, orders and grants, individual/bundle checkout, signed webhooks, restoration across devices, refund/reconciliation handling, and private R2 downloads. Use test-mode payments and an isolated test database before live configuration.

### Phase 4 — Release hardening
Complete offline update/recovery behavior, settings, privacy/account deletion, browser/device checks, production asset QA, deployment instructions, and rollback/recovery documentation.

Required meaningful verification:
- Unit tests: manifest schema; ownership/grant rules; bundle exclusions; stale audio sequence cancellation; find-it target behavior.
- Database/security tests: another parent's records are inaccessible; client cannot grant ownership; revoked order does not cancel a separate valid grant.
- Payment integration: invalid signature rejected; duplicate event grants once; delayed success reconciles; paid bundle grants exactly three books; refund rules act on correct grants.
- Download integration: unauthorized paid access denied; arbitrary object keys denied; expired URL refreshed; interruption recoverable; quota errors graceful; incomplete update preserves old book.
- End-to-end: anonymous free play/download; parent buys single; second device restores; parent buys bundle on a separate clean account; all modes work offline; sign-out clears paid local content.
- Manual mobile QA: audio unlock/suspension, quick repeated taps, tiny screen targets, portrait/landscape, reduced motion, and no purchase path exposed without parent gate.

### Additional acceptance checks for the updated direction
- Brand and PWA manifest read NuvoKids Books / Nuvo Books, not the retired working title.
- Free farm book has exactly twelve correctly ordered story pages plus a cover, all accessible anonymously.
- Series and app names are separate in metadata and UI; Nuvo ABC retains its name.
- No accidental implication that the bundle includes Nuvo ABC, games, or future books.
- Story audio interrupts/replays correctly and never overlaps object narration.
- Corrected Mimi tail and consistent character identities across final pages.
- Farmer/chick reunion, water lesson and ending visibly match narration; targeted animations use genuine separated parts or sprites.
- Production deployment uses Books origin and properly scoped redirects/CORS/service-worker scope; no cross-subdomain session assumptions.

## 12. Definition of launch complete

Launch only when all four books are playable, final assets are reviewed, prices are correct, real payment configuration is verified, ownership restores on another device, complete books reopen offline, public files cannot bypass paid download authorization, and purchase/refund failure recovery has evidence.

Deliver source code, migrations, functions, validated manifests, production-ready assets or an honest outstanding-assets list, content tooling, setup instructions, test results, and a release checklist. Explicitly report configuration blockers and unfinished work. Do not substitute a polished screenshot for a working purchasing and offline experience.

## 13. Official implementation references

Check current documentation when coding; these links are starting points, not frozen API specifications.

- Supabase passwordless email: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Stripe webhook example: https://supabase.com/docs/guides/functions/examples/stripe-webhooks
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Cloudflare Pages Vite deployment: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe webhooks: https://docs.stripe.com/webhooks
