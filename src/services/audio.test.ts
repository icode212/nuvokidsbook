import { expect, it, vi } from 'vitest';
import { AudioController, type AudioDriver } from './audio';
it('uses the animal file instead of speech or a preview tone', async () => {
  const driver: AudioDriver = { unlock:vi.fn(),stop:vi.fn(),speak:vi.fn(async()=>{}),tone:vi.fn(async()=>{}),effect:vi.fn(async()=>{}) };
  await new AudioController(driver).play(null,'/effects/cow.wav');
  expect(driver.effect).toHaveBeenCalledWith('/effects/cow.wav',expect.any(AbortSignal));
  expect(driver.speak).not.toHaveBeenCalled(); expect(driver.tone).not.toHaveBeenCalled();
});
it('cancels stale speech before its effect can play', async () => {
  const pending: (() => void)[] = []; const signals: AbortSignal[] = [];
  const driver: AudioDriver = { unlock:vi.fn(), stop:vi.fn(), tone:vi.fn(async () => {}), speak:vi.fn((_text,signal) => { signals.push(signal); return new Promise<void>(r => pending.push(r)); }) };
  const audio = new AudioController(driver);
  const old = audio.play('Old object', true); const current = audio.play('New object', true);
  expect(signals[0].aborted).toBe(true); pending[0](); await old;
  expect(driver.tone).not.toHaveBeenCalled(); pending[1](); await current;
  expect(driver.tone).toHaveBeenCalledTimes(1);
});
it('stop cancels the active sequence without starting a sound', async () => {
  let finish!: () => void;
  const driver: AudioDriver = { unlock:vi.fn(),stop:vi.fn(),tone:vi.fn(async()=>{}),speak:vi.fn(()=>new Promise<void>(r=>{finish=r;})) };
  const audio = new AudioController(driver); const playing = audio.play('story', true); audio.stop(); finish(); await playing;
  expect(driver.tone).not.toHaveBeenCalled();
});
