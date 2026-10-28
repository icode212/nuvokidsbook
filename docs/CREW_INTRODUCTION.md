# Bookshelf crew introduction

The hero uses the supplied `docs/characters/Wonder-Crew.png`, converted without cropping to a 1200×800 WebP. The original source stays intact. The farm book cover remains on its bookshelf card.

Children can tap each character directly in the portrait for a short individual introduction, or choose **Meet the crew** for a 14-second introduction. Responsive, keyboard-accessible tap areas follow the portrait; Pip and Mimi's foreground tap areas take priority over the children behind them. The selected character is outlined and named while speaking. The redundant name buttons below the image have been removed. Mimi's area is narrowed to 13.5% of the portrait width, with a 44px minimum touch target. Character descriptions follow `docs/characters/characters.md`. There is no autoplay, trailing effect or animal impersonation. A visible transcript accompanies playback.

All six clips use the approved Kokoro-82M v1.0 `af_heart`, `en-us`, speed 0.82, +1 semitone, mono AAC M4A targeting 32 kbps. Generate with `scripts/prepare-crew.py --model PATH --voices PATH --ffmpeg PATH`, using the same Python environment as the book narration. Per-clip manifests record exact transcripts, settings, hashes, durations and source-code provenance.

Read aloud and saved voice volume apply. The hero has its own accessible mute toggle. Selecting another name, stopping the introduction, opening a book/parent area, or leaving/backgrounding the page cancels playback. Prepared recordings never fall back to browser speech.

The portrait and six recordings total approximately 410 KB and are precached with the PWA shell by `scripts/build-sw.mjs`. They work offline once the updated shell has been saved; existing book downloads need no replacement for this hero change. Browser tests cover all five individual clips, the group introduction, mute, saved voice gain and offline reload.
