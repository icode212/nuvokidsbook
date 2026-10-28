import { savedMedia } from './downloads';
import { mediaURL } from './platform';
/** One foreground channel. Farm narration uses bundled Kokoro recordings. */
export interface AudioDriver { speak(text: string, signal: AbortSignal): Promise<void>; effect?(path: string, signal: AbortSignal): Promise<void>; tone(signal: AbortSignal): Promise<void>; stop(): void; unlock(): void }
export class AudioController {
  private request?: AbortController;
  constructor(private driver: AudioDriver) {}
  unlock() { this.driver.unlock(); }
  stop() { this.request?.abort(); this.driver.stop(); }
  async play(text: string | null, sound: boolean | string) {
    this.stop(); this.unlock();
    const request = new AbortController(); this.request = request;
    try {
      if (text) await this.driver.speak(text, request.signal);
      if (!request.signal.aborted && typeof sound === 'string') await this.driver.effect?.(sound, request.signal);
      else if (!request.signal.aborted && sound) await this.driver.tone(request.signal);
    } catch { /* Cancellation and unavailable browser voices are nonfatal. */ }
  }
}
export function createBrowserDriver(bookId?: string, narrationAssets?: Record<string, string>, voiceVolume: () => number = () => .85): AudioDriver {
  let context: AudioContext | undefined;
  const nodes = new Set<OscillatorNode | AudioBufferSourceNode>();
  async function playFile(path: string, signal: AbortSignal, volume = .85) {
    if (volume <= 0) return;
    if (!context || signal.aborted) return;
    const blob = bookId ? await savedMedia(bookId, path) : undefined;
    signal.throwIfAborted();
    let bytes: ArrayBuffer;
    if (blob) bytes = await blob.arrayBuffer();
    else { const response = await fetch(mediaURL(path), { signal }); if (!response.ok) throw new Error('Audio could not be loaded.'); bytes = await response.arrayBuffer(); }
    signal.throwIfAborted();
    const buffer = await context.decodeAudioData(bytes);
    signal.throwIfAborted(); await context.resume(); signal.throwIfAborted();
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; gain.gain.value = volume; source.connect(gain); gain.connect(context.destination);
    await new Promise<void>(resolve => {
      const abort = () => { try { source.stop(); } catch { /* already stopped */ } };
      source.onended = () => { nodes.delete(source); source.disconnect(); gain.disconnect(); signal.removeEventListener('abort', abort); resolve(); };
      signal.addEventListener('abort', abort, { once: true }); nodes.add(source); source.start();
    });
  }
  return {
    effect: playFile,
    unlock() { try { context ??= new AudioContext(); void context.resume().catch(() => {}); } catch { /* unsupported */ } },
    stop() { window.speechSynthesis?.cancel(); for (const node of nodes) { try { node.stop(); } catch { /* already stopped */ } } nodes.clear(); },
    async speak(text, signal) {
      const volume = Math.max(0, Math.min(1, voiceVolume()));
      if (!volume) return;
      const recorded = narrationAssets?.[text];
      if (recorded) {
        return playFile(recorded, signal, volume);
      }
      // A prepared book never silently switches back to the disliked browser voice.
      if (narrationAssets && Object.keys(narrationAssets).length) return;
      return new Promise(resolve => {
        if (signal.aborted || !window.speechSynthesis) return resolve();
        const speech = new SpeechSynthesisUtterance(text); speech.lang = 'en-CA'; speech.rate = .85; speech.pitch = 1.05; speech.volume = volume;
        const voices = window.speechSynthesis.getVoices();
        speech.voice = voices.find(v => v.lang === 'en-CA' && v.localService) ?? voices.find(v => v.lang.startsWith('en') && v.localService) ?? null;
        let timer: ReturnType<typeof setTimeout>;
        const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
        speech.onend = finish; speech.onerror = finish; signal.addEventListener('abort', finish, { once: true });
        timer = setTimeout(() => { window.speechSynthesis.cancel(); finish(); }, Math.max(5000, text.length * 130));
        window.speechSynthesis.speak(speech);
      });
    },
    tone(signal) {
      return new Promise(resolve => {
        if (!context || signal.aborted) return resolve();
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(660, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + .15);
        gain.gain.setValueAtTime(0, context.currentTime); gain.gain.linearRampToValueAtTime(.045, context.currentTime + .02); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .3);
        oscillator.connect(gain); gain.connect(context.destination); nodes.add(oscillator);
        oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); resolve(); };
        oscillator.start(); oscillator.stop(context.currentTime + .32);
      });
    },
  };
}
