# Kokoro narration update — version 0.4.0

The current farm book uses 74 bundled Kokoro recordings for twelve story pages, spoken object descriptions, Find it prompts and shared feedback. Animal taps retain the real animal recordings; the experimental spoken cow imitation is excluded.

Approved pipeline, adapted from NuvoABC's `generate-welcome-voice.py` and `compact-voice-assets.py`: Kokoro-82M v1.0, `af_heart`, `en-us`, speed `0.82`, sentence pause `0.3`, +1 semitone pitch resampling, peak cap 0.88 / maximum gain 2, 60 ms leading / 120 ms trailing silence. Delivery is mono 24 kHz AAC M4A targeting 32 kbps (short clip average bitrates vary).

Generate with `scripts/prepare-kokoro-narration.py --model PATH --voices PATH --ffmpeg PATH` and Python `kokoro-onnx==0.6.1`. This supersedes the legacy Samantha generation command below. The versioned `voice-manifest.json` records settings, model hash, transcripts, durations and output hashes. The offline inventory includes images, narration and animal calls with size/SHA-256 checks.

Voice volume is saved in Grown-ups settings and controls spoken playback independently of animal calls. Reader mute stops all audio. Volume changes stop current playback; subsequent narration uses the new level. Use **Grown-ups → Save update** online to update an older offline book. Interrupted updates preserve the existing complete download. Playback needs no speech service.

## Historical Samantha update (superseded)

The farm book now uses the same **Samantha** voice and **145 words/minute** rate as NewNuvoKids’s prepared prompts. Browser-default speech is no longer used for this book. No other app files were modified.

- 74 unique WAV clips: twelve stories, object identification, eligible Find it prompts and shared feedback.
- 22,050 Hz, 16-bit PCM mono; gain is limited during playback. Audio is generated locally, without a network TTS service.
- `content-source/a-day-at-the-farm/narration.json` maps exact transcripts to immutable versioned audio paths.
- `scripts/prepare-narration.mjs` regenerates the clips and complete size/SHA-256 inventory. Run after `npm run assets` if rebuilding all delivery files. It requires macOS Samantha, `say` and `afconvert`.
- Book version **0.2.0** reuses immutable 0.1.0 pictures and adds the new audio pack. The complete download is approximately **11.3 MB**.
- The Web Audio player loads saved IndexedDB blobs offline, releases decoded buffers after playback, and cancels stale fetch/decode/playback sequences on rapid taps, navigation, backgrounding or mute.
- Existing saved 0.1.0 books remain intact. Use **Grown-ups → Save update** while online to add the new voice for offline reading.
- If a prepared audio file fails, the farm book does not unexpectedly fall back to the browser voice. Other books without prepared media retain the development speech fallback.

This supersedes earlier handoff statements that the farm relies on browser speech or cannot narrate offline. Animal effects remain preview tones; layered animal animation and final educational/audio/rights approval are still outstanding. Generated system-voice files are not represented as a commissioned human recording or approved commercial release assets.
