# Supplied farm recordings — version 0.5.0

Current effects come from `docs/animals-sound/`: `cow-moo.wav`, `Birds.wav`, `Ducks.wav`, `Chickens.wav`, `Horse.wav`, `Sheeps.mov` (audio extracted), and `Door.wav`. Hen and chick taps share the supplied chicken recording; calves and lambs share cow/sheep calls. Barn and shelter doors now use the supplied door recording. No narrator impersonations are included. Kokoro narration remains unchanged at version 0.4.0.

`scripts/prepare-provided-effects.py --ffmpeg PATH` keeps the full recordings, converts to mono 24 kHz PCM16 WAV, reduces peaks above 0.45 and applies 20 ms edge fades. Originals are unchanged. The version 0.5.0 inventory verifies the complete 7.78 MB offline pack. Use **Grown-ups → Save update** for an existing offline copy.

The current rights ledger records user-supplied provenance and source hashes; no external source/license was provided for these files. The CC0 sources below describe the previous pack only.

## Historical version 0.3.0 (superseded)

Animal taps in Explore now play the corresponding recorded call immediately. They do not first say “This is a cow” or imitate an animal with the narrator’s voice. Story narration and Find it questions remain separate human speech. The parent sound switch and reader mute control silence calls; the narration switch controls stories and spoken prompts.

Seven source recordings are included: cow, birds, sheep, ducks, hen, chicks and horse. Calf and lamb taps currently share the cattle/sheep family recording; they are not separately verified age-specific calls. Non-animal actions still use the earlier development feedback until appropriate foley is prepared. The farmer can still speak a goodbye.

These are **real recordings**, not generated animal impersonations. Each source page explicitly offers CC0. Source URLs, creators, preview-download URLs, edits, durations and final-file hashes are recorded in `content-source/a-day-at-the-farm/effect-rights.json`.

- [Cow — spurioustransients](https://freesound.org/people/spurioustransients/sounds/513557/)
- [Birds — FartMuffin](https://freesound.org/people/FartMuffin/sounds/506285/)
- [Sheep — michaelperfect](https://freesound.org/people/michaelperfect/sounds/710296/)
- [Duck — gibarroule](https://freesound.org/people/gibarroule/sounds/365133/)
- [Hen — Breviceps](https://freesound.org/people/Breviceps/sounds/456803/)
- [Chicks — AGFX](https://freesound.org/people/AGFX/sounds/43380/)
- [Horse — dontwanttobehere](https://freesound.org/people/dontwanttobehere/sounds/656661/)

The delivery clips are short mono 22,050 Hz WAV excerpts. Preparation applies a peak cap of 0.45, target RMS up to 0.10 without increasing gain beyond 3×, and 40 ms edge fades. Playback gain is 0.85. Device volume remains parent-controlled; these measurements do not establish physical loudness or replace listening review on target devices.

`python3 scripts/prepare-farm-effects.py` downloads and prepares the source files and writes the combined 0.3.0 inventory. It reuses immutable pictures and Samantha narration from earlier versions. The verified pack is approximately 12.1 MB. Existing downloaded versions remain intact until **Grown-ups → Save update** finishes.

The previous Samantha-only change could sound similar because it changed the narrator, while object taps still spoke a description and used a generic tone. Version 0.3.0 changes the animal-tap behaviour itself. If an older tab still shows the old behaviour, reload while online and save the book update for offline use. No browser storage or reading progress needs to be cleared.
